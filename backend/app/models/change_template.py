from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.change import ChangeType, ChangeRisk, ChangeImpact

class ChangeTemplate(Base):
    __tablename__ = "change_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    change_type = Column(SQLEnum(ChangeType), default=ChangeType.STANDARD)
    risk = Column(SQLEnum(ChangeRisk), default=ChangeRisk.LOW)
    impact = Column(SQLEnum(ChangeImpact), default=ChangeImpact.LOW)
    
    # Template content
    title_template = Column(String(255))
    description_template = Column(Text)
    implementation_plan_template = Column(Text)
    rollback_plan_template = Column(Text)
    testing_plan_template = Column(Text)
    
    # Default settings
    requires_cab_approval = Column(Boolean, default=True)
    category_id = Column(Integer)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<ChangeTemplate {self.name}>"