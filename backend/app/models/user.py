from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    employee_id = Column(String(50), unique=True, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    
    # Profile
    avatar_url = Column(String(500), nullable=True)  # Legacy - for backwards compatibility
    avatar_data = Column(Text, nullable=True)  # Base64 encoded avatar image
    avatar_mime_type = Column(String(50), nullable=True)  # MIME type of avatar (e.g., image/jpeg)
    timezone = Column(String(50), default="UTC")
    language = Column(String(10), default="en")
    
    # Department & Role
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    
    # Manager relationship
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    department = relationship(
        "Department", 
        back_populates="users",
        foreign_keys=[department_id]
    )
    role = relationship("Role", back_populates="users")
    manager = relationship("User", remote_side=[id], backref="subordinates")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Ticket relationships
    created_tickets = relationship(
        "Ticket",
        back_populates="requester",
        foreign_keys="Ticket.requester_id"
    )
    assigned_tickets = relationship(
        "Ticket",
        back_populates="assignee",
        foreign_keys="Ticket.assignee_id"
    )

    # Chat relationships
    chat_conversations = relationship("ChatConversation", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"