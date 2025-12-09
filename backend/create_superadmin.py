#!/usr/bin/env python3
"""
=============================================================================
ITSM Platform - Super Admin Setup Script
=============================================================================
This script creates the initial super admin user and required system data
for a fresh deployment. Run this ONCE after database migration.

Usage:
    python create_superadmin.py

Environment Variables (Optional - will prompt if not set):
    ADMIN_EMAIL      - Super admin email address
    ADMIN_USERNAME   - Super admin username
    ADMIN_PASSWORD   - Super admin password (min 8 chars, must include
                       uppercase, lowercase, digit, special char)
    ADMIN_FULLNAME   - Super admin full name
=============================================================================
"""

import os
import sys
import re
import getpass
from datetime import datetime

# Add the parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.department import Department
from app.core.security import get_password_hash


def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    return True, "Password is valid"


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def get_input(prompt: str, env_var: str = None, is_password: bool = False,
              validator=None, error_msg: str = None) -> str:
    """Get input from environment variable or prompt user"""
    # Try environment variable first
    if env_var and os.environ.get(env_var):
        value = os.environ.get(env_var)
        if validator and not validator(value):
            print(f"  Warning: Environment variable {env_var} validation failed")
        else:
            return value

    # Prompt user
    while True:
        if is_password:
            value = getpass.getpass(prompt)
        else:
            value = input(prompt)

        if not value.strip():
            print("  Error: This field is required")
            continue

        if validator:
            if callable(validator):
                if validator == validate_password:
                    is_valid, msg = validate_password(value)
                    if not is_valid:
                        print(f"  Error: {msg}")
                        continue
                elif not validator(value):
                    print(f"  Error: {error_msg or 'Invalid input'}")
                    continue

        return value.strip()


def create_permissions(db) -> dict:
    """Create the core permission set"""
    print("\n  Creating permissions...")

    permission_map = {
        # Incidents
        'incidents.create.own': ('Incidents', 'Create own incidents', 'incidents', 'create', 'own'),
        'incidents.read.own': ('Incidents', 'Read own incidents', 'incidents', 'read', 'own'),
        'incidents.read.team': ('Incidents', 'Read team incidents', 'incidents', 'read', 'team'),
        'incidents.read.all': ('Incidents', 'Read all incidents', 'incidents', 'read', 'all'),
        'incidents.update.own': ('Incidents', 'Update own incidents', 'incidents', 'update', 'own'),
        'incidents.update.team': ('Incidents', 'Update team incidents', 'incidents', 'update', 'team'),
        'incidents.update.all': ('Incidents', 'Update all incidents', 'incidents', 'update', 'all'),
        'incidents.delete.all': ('Incidents', 'Delete incidents', 'incidents', 'delete', 'all'),
        'incidents.assign.team': ('Incidents', 'Assign to team', 'incidents', 'assign', 'team'),
        'incidents.assign.all': ('Incidents', 'Assign to anyone', 'incidents', 'assign', 'all'),
        'incidents.close.own': ('Incidents', 'Close own incidents', 'incidents', 'close', 'own'),
        'incidents.close.team': ('Incidents', 'Close team incidents', 'incidents', 'close', 'team'),
        'incidents.close.all': ('Incidents', 'Close all incidents', 'incidents', 'close', 'all'),
        # Service Requests
        'requests.create.own': ('Service Requests', 'Create service requests', 'requests', 'create', 'own'),
        'requests.read.own': ('Service Requests', 'Read own requests', 'requests', 'read', 'own'),
        'requests.read.all': ('Service Requests', 'Read all requests', 'requests', 'read', 'all'),
        'requests.update.own': ('Service Requests', 'Update own requests', 'requests', 'update', 'own'),
        'requests.update.all': ('Service Requests', 'Update all requests', 'requests', 'update', 'all'),
        'requests.approve.all': ('Service Requests', 'Approve requests', 'requests', 'approve', 'all'),
        # Changes
        'changes.create.own': ('Changes', 'Create change requests', 'changes', 'create', 'own'),
        'changes.read.own': ('Changes', 'Read own changes', 'changes', 'read', 'own'),
        'changes.read.all': ('Changes', 'Read all changes', 'changes', 'read', 'all'),
        'changes.update.own': ('Changes', 'Update own changes', 'changes', 'update', 'own'),
        'changes.update.all': ('Changes', 'Update all changes', 'changes', 'update', 'all'),
        'changes.approve.all': ('Changes', 'Approve changes (CAB)', 'changes', 'approve', 'all'),
        'changes.delete.all': ('Changes', 'Delete changes', 'changes', 'delete', 'all'),
        # Problems
        'problems.create.all': ('Problems', 'Create problems', 'problems', 'create', 'all'),
        'problems.read.all': ('Problems', 'Read all problems', 'problems', 'read', 'all'),
        'problems.update.all': ('Problems', 'Update problems', 'problems', 'update', 'all'),
        'problems.delete.all': ('Problems', 'Delete problems', 'problems', 'delete', 'all'),
        # Assets
        'assets.create.all': ('Assets', 'Create assets', 'assets', 'create', 'all'),
        'assets.read.own': ('Assets', 'Read own assets', 'assets', 'read', 'own'),
        'assets.read.all': ('Assets', 'Read all assets', 'assets', 'read', 'all'),
        'assets.update.all': ('Assets', 'Update assets', 'assets', 'update', 'all'),
        'assets.delete.all': ('Assets', 'Delete assets', 'assets', 'delete', 'all'),
        'assets.assign.all': ('Assets', 'Assign assets', 'assets', 'assign', 'all'),
        # Knowledge Base
        'knowledge.create.own': ('Knowledge', 'Create articles', 'knowledge', 'create', 'own'),
        'knowledge.read.all': ('Knowledge', 'Read articles', 'knowledge', 'read', 'all'),
        'knowledge.update.own': ('Knowledge', 'Update own articles', 'knowledge', 'update', 'own'),
        'knowledge.update.all': ('Knowledge', 'Update all articles', 'knowledge', 'update', 'all'),
        'knowledge.delete.own': ('Knowledge', 'Delete own articles', 'knowledge', 'delete', 'own'),
        'knowledge.delete.all': ('Knowledge', 'Delete all articles', 'knowledge', 'delete', 'all'),
        'knowledge.approve.all': ('Knowledge', 'Approve/publish articles', 'knowledge', 'approve', 'all'),
        # Users
        'users.create.all': ('Users', 'Create users', 'users', 'create', 'all'),
        'users.read.all': ('Users', 'Read all users', 'users', 'read', 'all'),
        'users.update.own': ('Users', 'Update own profile', 'users', 'update', 'own'),
        'users.update.all': ('Users', 'Update all users', 'users', 'update', 'all'),
        'users.delete.all': ('Users', 'Delete users', 'users', 'delete', 'all'),
        # Roles
        'roles.create.all': ('Roles', 'Create roles', 'roles', 'create', 'all'),
        'roles.read.all': ('Roles', 'Read roles', 'roles', 'read', 'all'),
        'roles.update.all': ('Roles', 'Update roles', 'roles', 'update', 'all'),
        'roles.delete.all': ('Roles', 'Delete roles', 'roles', 'delete', 'all'),
        # Settings & Reports
        'settings.read.all': ('Settings', 'View settings', 'settings', 'read', 'all'),
        'settings.update.all': ('Settings', 'Update settings', 'settings', 'update', 'all'),
        'reports.read.all': ('Reports', 'View reports', 'reports', 'read', 'all'),
        'reports.export.all': ('Reports', 'Export reports', 'reports', 'export', 'all'),
    }

    permissions = {}
    for perm_key, (display_name, description, module, action, scope) in permission_map.items():
        # Check if permission exists
        existing = db.query(Permission).filter(Permission.name == perm_key).first()
        if existing:
            permissions[perm_key] = existing
        else:
            permission = Permission(
                name=perm_key,
                display_name=f"{display_name} ({scope})",
                description=description,
                module=module,
                action=action,
                scope=scope,
                is_active=True
            )
            db.add(permission)
            db.flush()
            permissions[perm_key] = permission

    print(f"    Created/verified {len(permissions)} permissions")
    return permissions


def create_roles(db, permissions: dict) -> dict:
    """Create the system roles"""
    print("\n  Creating roles...")

    roles_data = {
        'admin': {
            'display_name': 'System Administrator',
            'description': 'Full system access with all permissions',
            'role_type': 'admin',
            'level': 100,
            'is_system': True,
            'permissions': list(permissions.values())
        },
        'manager': {
            'display_name': 'Manager',
            'description': 'Department manager with oversight capabilities',
            'role_type': 'manager',
            'level': 80,
            'is_system': True,
            'permissions': [
                permissions['incidents.read.all'], permissions['incidents.update.all'],
                permissions['incidents.assign.all'], permissions['incidents.close.all'],
                permissions['requests.read.all'], permissions['requests.update.all'],
                permissions['requests.approve.all'], permissions['changes.read.all'],
                permissions['changes.approve.all'], permissions['assets.read.all'],
                permissions['knowledge.read.all'], permissions['users.read.all'],
                permissions['reports.read.all'], permissions['reports.export.all'],
                permissions['problems.read.all'], permissions['problems.update.all'],
            ]
        },
        'team_lead': {
            'display_name': 'Team Lead',
            'description': 'Support team leader with team management capabilities',
            'role_type': 'team_lead',
            'level': 60,
            'is_system': True,
            'permissions': [
                permissions['incidents.create.own'], permissions['incidents.read.team'],
                permissions['incidents.update.team'], permissions['incidents.assign.team'],
                permissions['incidents.close.team'], permissions['requests.create.own'],
                permissions['requests.read.all'], permissions['requests.update.all'],
                permissions['changes.read.all'], permissions['changes.create.own'],
                permissions['assets.read.all'], permissions['knowledge.create.own'],
                permissions['knowledge.read.all'], permissions['knowledge.update.own'],
                permissions['users.read.all'], permissions['reports.read.all'],
                permissions['problems.read.all'], permissions['problems.create.all'],
            ]
        },
        'agent': {
            'display_name': 'Support Agent',
            'description': 'Front-line support agent',
            'role_type': 'agent',
            'level': 40,
            'is_system': True,
            'permissions': [
                permissions['incidents.create.own'], permissions['incidents.read.team'],
                permissions['incidents.update.team'], permissions['incidents.close.own'],
                permissions['requests.create.own'], permissions['requests.read.all'],
                permissions['requests.update.own'], permissions['changes.read.own'],
                permissions['changes.create.own'], permissions['assets.read.all'],
                permissions['knowledge.create.own'], permissions['knowledge.read.all'],
                permissions['knowledge.update.own'], permissions['users.read.all'],
                permissions['users.update.own'], permissions['reports.read.all'],
            ]
        },
        'end_user': {
            'display_name': 'End User',
            'description': 'Standard end user with basic permissions',
            'role_type': 'end_user',
            'level': 10,
            'is_system': True,
            'permissions': [
                permissions['incidents.create.own'], permissions['incidents.read.own'],
                permissions['incidents.update.own'], permissions['requests.create.own'],
                permissions['requests.read.own'], permissions['assets.read.own'],
                permissions['knowledge.read.all'], permissions['users.update.own'],
            ]
        },
    }

    roles = {}
    for role_name, role_info in roles_data.items():
        role_permissions = role_info.pop('permissions')

        # Check if role exists
        existing = db.query(Role).filter(Role.name == role_name).first()
        if existing:
            roles[role_name] = existing
        else:
            role = Role(name=role_name, **role_info, is_active=True)
            role.permissions = role_permissions
            db.add(role)
            db.flush()
            roles[role_name] = role

    print(f"    Created/verified {len(roles)} roles")
    return roles


def create_default_department(db) -> Department:
    """Create a default IT department"""
    print("\n  Creating default department...")

    existing = db.query(Department).filter(Department.name == "IT Department").first()
    if existing:
        print("    Using existing IT Department")
        return existing

    department = Department(
        name="IT Department",
        description="Information Technology Department",
        is_active=True
    )
    db.add(department)
    db.flush()
    print("    Created IT Department")
    return department


def main():
    print("\n" + "=" * 70)
    print("  ITSM Platform - Super Admin Setup")
    print("=" * 70)

    # Check if database connection works
    print("\n[1/5] Checking database connection...")
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        print("  Database connection successful!")
    except Exception as e:
        print(f"  ERROR: Cannot connect to database: {e}")
        print("\n  Please ensure:")
        print("    1. Database server is running")
        print("    2. DATABASE_URL environment variable is set correctly")
        print("    3. Database migrations have been run (alembic upgrade head)")
        sys.exit(1)

    # Check if super admin already exists
    print("\n[2/5] Checking for existing super admin...")
    existing_admin = db.query(User).filter(User.is_superuser == True).first()
    if existing_admin:
        print(f"  WARNING: Super admin already exists: {existing_admin.email}")
        response = input("  Do you want to create another super admin? (y/N): ")
        if response.lower() != 'y':
            print("\n  Setup cancelled.")
            db.close()
            sys.exit(0)

    # Get admin credentials
    print("\n[3/5] Enter Super Admin credentials:")
    print("  (You can also set these via environment variables)")
    print("")

    email = get_input(
        "  Email: ",
        "ADMIN_EMAIL",
        validator=validate_email,
        error_msg="Invalid email format"
    )

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        print(f"  ERROR: User with email {email} already exists")
        db.close()
        sys.exit(1)

    username = get_input("  Username: ", "ADMIN_USERNAME")

    # Check if username already exists
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        print(f"  ERROR: User with username {username} already exists")
        db.close()
        sys.exit(1)

    full_name = get_input("  Full Name: ", "ADMIN_FULLNAME")

    password = get_input(
        "  Password: ",
        "ADMIN_PASSWORD",
        is_password=True,
        validator=validate_password
    )

    # Confirm password
    if not os.environ.get("ADMIN_PASSWORD"):
        password_confirm = getpass.getpass("  Confirm Password: ")
        if password != password_confirm:
            print("  ERROR: Passwords do not match")
            db.close()
            sys.exit(1)

    # Create system data
    print("\n[4/5] Creating system data...")

    try:
        permissions = create_permissions(db)
        roles = create_roles(db, permissions)
        department = create_default_department(db)

        # Create super admin user
        print("\n[5/5] Creating super admin user...")

        admin_user = User(
            email=email,
            username=username,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            role_id=roles['admin'].id,
            department_id=department.id,
            is_active=True,
            is_verified=True,
            is_superuser=True,
            timezone='UTC',
            language='en'
        )
        db.add(admin_user)
        db.commit()

        print("\n" + "=" * 70)
        print("  SUCCESS! Super Admin created successfully!")
        print("=" * 70)
        print(f"\n  Login Credentials:")
        print(f"    Email:    {email}")
        print(f"    Username: {username}")
        print(f"    Password: ********** (as entered)")
        print(f"\n  You can now login to the ITSM Platform!")
        print("=" * 70 + "\n")

    except Exception as e:
        print(f"\n  ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
