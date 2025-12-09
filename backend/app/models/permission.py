from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.role import role_permissions

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Module: incidents, requests, changes, problems, assets, knowledge, users, settings
    module = Column(String(50), nullable=False)
    
    # Action: create, read, update, delete, approve, assign, escalate, close
    action = Column(String(50), nullable=False)
    
    # Resource: *, own, team, department, all
    scope = Column(String(50), default="own")
    
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")
    
    def __repr__(self):
        return f"<Permission {self.module}.{self.action}>"