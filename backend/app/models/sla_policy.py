from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class SLAPolicy(Base):
    __tablename__ = "sla_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    response_time = Column(Integer, nullable=False)
    resolution_time = Column(Integer, nullable=False)
    priority_times = Column(JSON, nullable=True)
    business_hours_only = Column(Boolean, default=True)
    conditions = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    tickets = relationship("Ticket", back_populates="sla_policy")
    
    def __repr__(self):
        return f"<SLAPolicy {self.name}>"