"""
Add missing role permissions to existing database
Run this script to add roles module permissions if not already present
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.permission import Permission
from app.models.role import Role

db = SessionLocal()

try:
    # Define roles permissions
    roles_permissions = [
        ('roles.create.all', 'Roles (all)', 'Create roles', 'roles', 'create', 'all'),
        ('roles.read.all', 'Roles (all)', 'Read roles', 'roles', 'read', 'all'),
        ('roles.update.all', 'Roles (all)', 'Update roles', 'roles', 'update', 'all'),
        ('roles.delete.all', 'Roles (all)', 'Delete roles', 'roles', 'delete', 'all'),
    ]

    created_permissions = []
    for name, display_name, description, module, action, scope in roles_permissions:
        # Check if permission already exists
        existing = db.query(Permission).filter(Permission.name == name).first()
        if not existing:
            permission = Permission(
                name=name,
                display_name=display_name,
                description=description,
                module=module,
                action=action,
                scope=scope,
                is_active=True
            )
            db.add(permission)
            db.flush()
            created_permissions.append(permission)
            print(f"Created permission: {name}")
        else:
            created_permissions.append(existing)
            print(f"Permission already exists: {name}")

    # Add all roles permissions to admin role
    admin_role = db.query(Role).filter(Role.name == 'admin').first()
    if admin_role:
        for permission in created_permissions:
            if permission not in admin_role.permissions:
                admin_role.permissions.append(permission)
                print(f"Added {permission.name} to admin role")

    db.commit()
    print("\nRole permissions added successfully!")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
