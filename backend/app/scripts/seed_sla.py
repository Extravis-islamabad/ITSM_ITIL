from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.sla_policy import SLAPolicy

def seed_default_sla():
    db = SessionLocal()
    try:
        existing = db.query(SLAPolicy).filter(SLAPolicy.is_default == True).first()
        if existing:
            print("Default SLA policy already exists")
            return
        
        default_policy = SLAPolicy(
            name="Default SLA Policy",
            description="Standard SLA for all tickets",
            response_time=60,
            resolution_time=480,
            priority_times={
                "CRITICAL": {"response": 15, "resolution": 240},
                "HIGH": {"response": 30, "resolution": 360},
                "MEDIUM": {"response": 60, "resolution": 480},
                "LOW": {"response": 120, "resolution": 720}
            },
            business_hours_only=True,
            conditions=None,
            is_active=True,
            is_default=True
        )
        
        db.add(default_policy)
        db.commit()
        print("✅ Default SLA policy created successfully")
        print(f"   - Response times: CRITICAL(15m), HIGH(30m), MEDIUM(60m), LOW(120m)")
        print(f"   - Resolution times: CRITICAL(4h), HIGH(6h), MEDIUM(8h), LOW(12h)")
    except Exception as e:
        print(f"❌ Error creating default SLA: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_default_sla()