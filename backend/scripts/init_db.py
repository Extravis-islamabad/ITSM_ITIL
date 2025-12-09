"""
Initial database setup script
Creates default roles, permissions, and admin user
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models import Base, Role, Permission, User, Department
from app.core.security import get_password_hash

def create_permissions(db: Session):
    """Create default permissions"""
    permissions_data = [
        # Incident permissions
        {"name": "incidents.create", "display_name": "Create Incidents", "module": "incidents", "action": "create", "scope": "own"},
        {"name": "incidents.read.own", "display_name": "View Own Incidents", "module": "incidents", "action": "read", "scope": "own"},
        {"name": "incidents.read.team", "display_name": "View Team Incidents", "module": "incidents", "action": "read", "scope": "team"},
        {"name": "incidents.read.all", "display_name": "View All Incidents", "module": "incidents", "action": "read", "scope": "all"},
        {"name": "incidents.update.own", "display_name": "Update Own Incidents", "module": "incidents", "action": "update", "scope": "own"},
        {"name": "incidents.update.team", "display_name": "Update Team Incidents", "module": "incidents", "action": "update", "scope": "team"},
        {"name": "incidents.update.all", "display_name": "Update All Incidents", "module": "incidents", "action": "update", "scope": "all"},
        {"name": "incidents.delete", "display_name": "Delete Incidents", "module": "incidents", "action": "delete", "scope": "all"},
        {"name": "incidents.assign", "display_name": "Assign Incidents", "module": "incidents", "action": "assign", "scope": "team"},
        {"name": "incidents.escalate", "display_name": "Escalate Incidents", "module": "incidents", "action": "escalate", "scope": "own"},
        {"name": "incidents.close", "display_name": "Close Incidents", "module": "incidents", "action": "close", "scope": "own"},
        
        # Service Request permissions
        {"name": "requests.create", "display_name": "Create Requests", "module": "requests", "action": "create", "scope": "own"},
        {"name": "requests.read.own", "display_name": "View Own Requests", "module": "requests", "action": "read", "scope": "own"},
        {"name": "requests.read.all", "display_name": "View All Requests", "module": "requests", "action": "read", "scope": "all"},
        {"name": "requests.update.own", "display_name": "Update Own Requests", "module": "requests", "action": "update", "scope": "own"},
        {"name": "requests.update.all", "display_name": "Update All Requests", "module": "requests", "action": "update", "scope": "all"},
        {"name": "requests.approve", "display_name": "Approve Requests", "module": "requests", "action": "approve", "scope": "team"},
        {"name": "requests.delete", "display_name": "Delete Requests", "module": "requests", "action": "delete", "scope": "all"},
        
        # Change Management permissions
        {"name": "changes.create", "display_name": "Create Changes", "module": "changes", "action": "create", "scope": "own"},
        {"name": "changes.read.all", "display_name": "View All Changes", "module": "changes", "action": "read", "scope": "all"},
        {"name": "changes.update.all", "display_name": "Update All Changes", "module": "changes", "action": "update", "scope": "all"},
        {"name": "changes.approve", "display_name": "Approve Changes", "module": "changes", "action": "approve", "scope": "all"},
        {"name": "changes.delete", "display_name": "Delete Changes", "module": "changes", "action": "delete", "scope": "all"},
        
        # Problem Management permissions
        {"name": "problems.create", "display_name": "Create Problems", "module": "problems", "action": "create", "scope": "team"},
        {"name": "problems.read.all", "display_name": "View All Problems", "module": "problems", "action": "read", "scope": "all"},
        {"name": "problems.update.all", "display_name": "Update All Problems", "module": "problems", "action": "update", "scope": "all"},
        {"name": "problems.delete", "display_name": "Delete Problems", "module": "problems", "action": "delete", "scope": "all"},
        
        # Asset Management permissions
        {"name": "assets.create", "display_name": "Create Assets", "module": "assets", "action": "create", "scope": "all"},
        {"name": "assets.read.all", "display_name": "View All Assets", "module": "assets", "action": "read", "scope": "all"},
        {"name": "assets.update.all", "display_name": "Update All Assets", "module": "assets", "action": "update", "scope": "all"},
        {"name": "assets.delete", "display_name": "Delete Assets", "module": "assets", "action": "delete", "scope": "all"},
        
        # Knowledge Base permissions
        {"name": "knowledge.create", "display_name": "Create Articles", "module": "knowledge", "action": "create", "scope": "own"},
        {"name": "knowledge.read.all", "display_name": "View All Articles", "module": "knowledge", "action": "read", "scope": "all"},
        {"name": "knowledge.update.own", "display_name": "Update Own Articles", "module": "knowledge", "action": "update", "scope": "own"},
        {"name": "knowledge.update.all", "display_name": "Update All Articles", "module": "knowledge", "action": "update", "scope": "all"},
        {"name": "knowledge.approve", "display_name": "Approve Articles", "module": "knowledge", "action": "approve", "scope": "all"},
        {"name": "knowledge.delete", "display_name": "Delete Articles", "module": "knowledge", "action": "delete", "scope": "all"},
        
        # User Management permissions
        {"name": "users.create", "display_name": "Create Users", "module": "users", "action": "create", "scope": "all"},
        {"name": "users.read.all", "display_name": "View All Users", "module": "users", "action": "read", "scope": "all"},
        {"name": "users.update.all", "display_name": "Update All Users", "module": "users", "action": "update", "scope": "all"},
        {"name": "users.delete", "display_name": "Delete Users", "module": "users", "action": "delete", "scope": "all"},
        
        # Role Management permissions
        {"name": "roles.create", "display_name": "Create Roles", "module": "roles", "action": "create", "scope": "all"},
        {"name": "roles.read.all", "display_name": "View All Roles", "module": "roles", "action": "read", "scope": "all"},
        {"name": "roles.update.all", "display_name": "Update All Roles", "module": "roles", "action": "update", "scope": "all"},
        {"name": "roles.delete", "display_name": "Delete Roles", "module": "roles", "action": "delete", "scope": "all"},
        
        # Settings permissions
        {"name": "settings.read", "display_name": "View Settings", "module": "settings", "action": "read", "scope": "all"},
        {"name": "settings.update", "display_name": "Update Settings", "module": "settings", "action": "update", "scope": "all"},
        
        # Reports permissions
        {"name": "reports.read.own", "display_name": "View Own Reports", "module": "reports", "action": "read", "scope": "own"},
        {"name": "reports.read.all", "display_name": "View All Reports", "module": "reports", "action": "read", "scope": "all"},
    ]
    
    created_permissions = {}
    for perm_data in permissions_data:
        permission = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
        if not permission:
            permission = Permission(**perm_data)
            db.add(permission)
            db.flush()
        created_permissions[perm_data["name"]] = permission
    
    db.commit()
    return created_permissions

def create_roles(db: Session, permissions: dict):
    """Create default roles with permissions"""
    
    # End User Role
    end_user_perms = [
        permissions["incidents.create"],
        permissions["incidents.read.own"],
        permissions["incidents.update.own"],
        permissions["requests.create"],
        permissions["requests.read.own"],
        permissions["knowledge.read.all"],
    ]
    
    end_user_role = db.query(Role).filter(Role.name == "end_user").first()
    if not end_user_role:
        end_user_role = Role(
            name="end_user",
            display_name="End User",
            description="Standard end user with basic ticket creation rights",
            role_type="end_user",
            level=0,
            is_system=True
        )
        end_user_role.permissions = end_user_perms
        db.add(end_user_role)
    
    # Agent Role
    agent_perms = [
        permissions["incidents.create"],
        permissions["incidents.read.team"],
        permissions["incidents.update.team"],
        permissions["incidents.close"],
        permissions["requests.read.all"],
        permissions["requests.update.all"],
        permissions["knowledge.create"],
        permissions["knowledge.read.all"],
        permissions["knowledge.update.own"],
        permissions["assets.read.all"],
    ]
    
    agent_role = db.query(Role).filter(Role.name == "agent").first()
    if not agent_role:
        agent_role = Role(
            name="agent",
            display_name="Agent",
            description="Support agent with ticket management rights",
            role_type="agent",
            level=1,
            is_system=True
        )
        agent_role.permissions = agent_perms
        db.add(agent_role)
    
    # Team Lead Role
    team_lead_perms = agent_perms + [
        permissions["incidents.read.all"],
        permissions["incidents.update.all"],
        permissions["incidents.assign"],
        permissions["incidents.escalate"],
        permissions["requests.approve"],
        permissions["problems.create"],
        permissions["problems.read.all"],
        permissions["knowledge.approve"],
        permissions["reports.read.own"],
    ]
    
    team_lead_role = db.query(Role).filter(Role.name == "team_lead").first()
    if not team_lead_role:
        team_lead_role = Role(
            name="team_lead",
            display_name="Team Lead",
            description="Team lead with assignment and approval rights",
            role_type="team_lead",
            level=2,
            is_system=True
        )
        team_lead_role.permissions = team_lead_perms
        db.add(team_lead_role)
    
    # Manager Role
    manager_perms = team_lead_perms + [
        permissions["changes.create"],
        permissions["changes.read.all"],
        permissions["changes.update.all"],
        permissions["problems.update.all"],
        permissions["assets.create"],
        permissions["assets.update.all"],
        permissions["reports.read.all"],
    ]
    
    manager_role = db.query(Role).filter(Role.name == "manager").first()
    if not manager_role:
        manager_role = Role(
            name="manager",
            display_name="Manager",
            description="Manager with departmental oversight",
            role_type="manager",
            level=3,
            is_system=True
        )
        manager_role.permissions = manager_perms
        db.add(manager_role)
    
    # CAB Member Role
    cab_perms = [
        permissions["changes.read.all"],
        permissions["changes.approve"],
        permissions["incidents.read.all"],
        permissions["problems.read.all"],
        permissions["assets.read.all"],
    ]
    
    cab_role = db.query(Role).filter(Role.name == "cab_member").first()
    if not cab_role:
        cab_role = Role(
            name="cab_member",
            display_name="CAB Member",
            description="Change Advisory Board member",
            role_type="cab_member",
            level=3,
            is_system=True
        )
        cab_role.permissions = cab_perms
        db.add(cab_role)
    
    # Administrator Role (all permissions)
    admin_role = db.query(Role).filter(Role.name == "administrator").first()
    if not admin_role:
        admin_role = Role(
            name="administrator",
            display_name="Administrator",
            description="System administrator with full access",
            role_type="admin",
            level=4,
            is_system=True
        )
        admin_role.permissions = list(permissions.values())
        db.add(admin_role)
    
    db.commit()
    
    return {
        "end_user": end_user_role,
        "agent": agent_role,
        "team_lead": team_lead_role,
        "manager": manager_role,
        "cab_member": cab_role,
        "administrator": admin_role
    }

def create_departments(db: Session):
    """Create default departments"""
    departments_data = [
        {"name": "IT Support", "code": "IT", "description": "Information Technology Support"},
        {"name": "Human Resources", "code": "HR", "description": "Human Resources Department"},
        {"name": "Finance", "code": "FIN", "description": "Finance Department"},
        {"name": "Operations", "code": "OPS", "description": "Operations Department"},
    ]
    
    created_departments = {}
    for dept_data in departments_data:
        department = db.query(Department).filter(Department.code == dept_data["code"]).first()
        if not department:
            department = Department(**dept_data)
            db.add(department)
            db.flush()
        created_departments[dept_data["code"]] = department
    
    db.commit()
    return created_departments

def create_categories(db: Session):
    """Create default categories and subcategories"""
    categories_data = [
        {
            "name": "Hardware",
            "description": "Hardware related issues",
            "icon": "💻",
            "color": "#3B82F6",
            "subcategories": [
                {"name": "Desktop/Laptop", "description": "Desktop and laptop issues"},
                {"name": "Printer", "description": "Printer related issues"},
                {"name": "Mobile Device", "description": "Smartphone and tablet issues"},
                {"name": "Peripheral", "description": "Mouse, keyboard, monitor issues"}
            ]
        },
        {
            "name": "Software",
            "description": "Software and application issues",
            "icon": "⚙️",
            "color": "#8B5CF6",
            "subcategories": [
                {"name": "Operating System", "description": "Windows, macOS, Linux issues"},
                {"name": "Office Applications", "description": "MS Office, productivity tools"},
                {"name": "Email", "description": "Email client issues"},
                {"name": "Business Applications", "description": "CRM, ERP, custom apps"}
            ]
        },
        {
            "name": "Network",
            "description": "Network and connectivity issues",
            "icon": "🌐",
            "color": "#10B981",
            "subcategories": [
                {"name": "Internet Access", "description": "Internet connectivity issues"},
                {"name": "VPN", "description": "VPN connection issues"},
                {"name": "Wi-Fi", "description": "Wireless network issues"},
                {"name": "Network Drive", "description": "Shared drive access issues"}
            ]
        },
        {
            "name": "Account Access",
            "description": "User accounts and permissions",
            "icon": "🔐",
            "color": "#F59E0B",
            "subcategories": [
                {"name": "Password Reset", "description": "Password reset requests"},
                {"name": "Account Locked", "description": "Locked account issues"},
                {"name": "New Account", "description": "New account creation"},
                {"name": "Permissions", "description": "Access permission requests"}
            ]
        },
        {
            "name": "Service Request",
            "description": "General service requests",
            "icon": "📋",
            "color": "#EC4899",
            "subcategories": [
                {"name": "New Equipment", "description": "Request for new equipment"},
                {"name": "Software Installation", "description": "Software installation requests"},
                {"name": "Access Request", "description": "Access to systems or resources"},
                {"name": "Office Move", "description": "Office relocation requests"}
            ]
        }
    ]
    
    from app.models.category import Category, Subcategory
    
    for cat_data in categories_data:
        subcats = cat_data.pop("subcategories", [])
        
        category = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not category:
            category = Category(**cat_data)
            db.add(category)
            db.flush()
            
            # Add subcategories
            for subcat_data in subcats:
                subcat = Subcategory(
                    category_id=category.id,
                    **subcat_data
                )
                db.add(subcat)
    
    db.commit()
    print("✅ Categories and subcategories created")

def create_admin_user(db: Session, roles: dict, departments: dict):
    """Create default admin user"""
    admin_user = db.query(User).filter(User.username == "admin").first()
    
    if not admin_user:
        admin_user = User(
            email="admin@itsm.local",
            username="admin",
            full_name="System Administrator",
            hashed_password=get_password_hash("Admin@123"),
            employee_id="EMP-0001",
            department_id=departments["IT"].id,
            role_id=roles["administrator"].id,
            is_active=True,
            is_verified=True,
            is_superuser=True
        )
        db.add(admin_user)
        db.commit()
        print("✅ Admin user created: username=admin, password=Admin@123")
    else:
        print("ℹ️  Admin user already exists")

def init_database():
    """Initialize database with default data"""
    print("🔧 Initializing database...")
    
    # Create tables
    print("📊 Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        print("🔐 Creating permissions...")
        permissions = create_permissions(db)
        
        print("👥 Creating roles...")
        roles = create_roles(db, permissions)
        
        print("🏢 Creating departments...")
        departments = create_departments(db)
        
        print("📁 Creating categories...")
        create_categories(db)
        
        print("👤 Creating admin user...")
        create_admin_user(db, roles, departments)
        
        print("✅ Database initialization completed successfully!")
        print("\n" + "="*50)
        print("Default Admin Credentials:")
        print("Username: admin")
        print("Password: Admin@123")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"❌ Error during initialization: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()