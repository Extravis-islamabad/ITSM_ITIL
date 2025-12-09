from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Hierarchy
    parent_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # Department Head
    head_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Contact
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    
    # Location
    location = Column(String(255), nullable=True)
    
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    users = relationship(
        "User", 
        back_populates="department",
        foreign_keys="User.department_id"
    )
    parent = relationship("Department", remote_side=[id], backref="sub_departments")
    head = relationship(
        "User",
        foreign_keys=[head_id],
        post_update=True
    )
    
    def __repr__(self):
        return f"<Department {self.name}>"