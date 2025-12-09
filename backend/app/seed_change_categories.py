from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.category import Category, CategoryType, Subcategory

def seed_change_categories():
    db = SessionLocal()
    
    try:
        # Check if change categories already exist
        existing = db.query(Category).filter(Category.category_type == CategoryType.CHANGE).first()
        if existing:
            print("✅ Change categories already exist")
            return
        
        print("🌱 Seeding Change Management categories...")
        
        # Change Management Categories
        change_categories = [
            {
                "name": "Infrastructure",
                "description": "Hardware, servers, network infrastructure changes",
                "icon": "🖥️",
                "color": "#3b82f6",
                "category_type": CategoryType.CHANGE,
                "subcategories": [
                    {"name": "Server Upgrade", "description": "Server hardware or OS upgrades"},
                    {"name": "Network Changes", "description": "Network configuration, routing, switching"},
                    {"name": "Storage Expansion", "description": "SAN, NAS, disk storage changes"},
                    {"name": "Datacenter Changes", "description": "Physical datacenter modifications"},
                ]
            },
            {
                "name": "Application",
                "description": "Software application changes and updates",
                "icon": "📱",
                "color": "#8b5cf6",
                "category_type": CategoryType.CHANGE,
                "subcategories": [
                    {"name": "Application Upgrade", "description": "Version upgrades and updates"},
                    {"name": "New Feature Deployment", "description": "New functionality releases"},
                    {"name": "Bug Fix Release", "description": "Bug fixes and patches"},
                    {"name": "Configuration Change", "description": "Application settings modifications"},
                ]
            },
            {
                "name": "Database",
                "description": "Database system changes",
                "icon": "🗄️",
                "color": "#10b981",
                "category_type": CategoryType.CHANGE,
                "subcategories": [
                    {"name": "Database Upgrade", "description": "DBMS version upgrades"},
                    {"name": "Schema Change", "description": "Table structure modifications"},
                    {"name": "Performance Tuning", "description": "Query optimization, indexing"},
                    {"name": "Migration", "description": "Database migrations and transfers"},
                ]
            },
            {
                "name": "Security",
                "description": "Security-related changes",
                "icon": "🔒",
                "color": "#ef4444",
                "category_type": CategoryType.CHANGE,
                "subcategories": [
                    {"name": "Security Patch", "description": "Security updates and patches"},
                    {"name": "Firewall Changes", "description": "Firewall rule modifications"},
                    {"name": "Access Control", "description": "Permission and access changes"},
                    {"name": "Certificate Updates", "description": "SSL/TLS certificate renewals"},
                ]
            },
            {
                "name": "Cloud Services",
                "description": "Cloud platform changes",
                "icon": "☁️",
                "color": "#06b6d4",
                "category_type": CategoryType.CHANGE,
                "subcategories": [
                    {"name": "AWS Changes", "description": "Amazon Web Services modifications"},
                    {"name": "Azure Changes", "description": "Microsoft Azure modifications"},
                    {"name": "GCP Changes", "description": "Google Cloud Platform changes"},
                    {"name": "Cloud Migration", "description": "Moving services to cloud"},
                ]
            },
            {
                "name": "Business Process",
                "description": "Business process and workflow changes",
                "icon": "📋",
                "color": "#f59e0b",
                "category_type": CategoryType.CHANGE,
                "subcategories": [
                    {"name": "Workflow Change", "description": "Business workflow modifications"},
                    {"name": "Policy Update", "description": "Business policy changes"},
                    {"name": "Integration Change", "description": "System integration updates"},
                    {"name": "Automation", "description": "Process automation implementations"},
                ]
            },
        ]
        
        for cat_data in change_categories:
            subcats = cat_data.pop("subcategories", [])
            category = Category(**cat_data)
            db.add(category)
            db.flush()
            
            for subcat_data in subcats:
                subcategory = Subcategory(
                    category_id=category.id,
                    **subcat_data
                )
                db.add(subcategory)
        
        db.commit()
        print("✅ Change categories seeded successfully!")
        print(f"   Created {len(change_categories)} categories with subcategories")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding categories: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_change_categories()