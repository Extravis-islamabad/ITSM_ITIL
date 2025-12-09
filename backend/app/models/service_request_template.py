from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ServiceRequestTemplate(Base):
    __tablename__ = "service_request_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    icon = Column(String(50), nullable=True)
    estimated_days = Column(Integer, default=3)
    requires_approval = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    category = relationship("Category")
    
    def __repr__(self):
        return f"<ServiceRequestTemplate {self.name}>"