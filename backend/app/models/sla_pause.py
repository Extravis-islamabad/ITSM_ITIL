from sqlalchemy import Column, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class SLAPause(Base):
    __tablename__ = "sla_pauses"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    paused_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resumed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reason = Column(Text, nullable=False)
    paused_at = Column(DateTime(timezone=True), server_default=func.now())
    resumed_at = Column(DateTime(timezone=True), nullable=True)
    pause_duration = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    
    ticket = relationship("Ticket", back_populates="sla_pauses")
    paused_by = relationship("User", foreign_keys=[paused_by_id])
    resumed_by = relationship("User", foreign_keys=[resumed_by_id])
    
    def __repr__(self):
        return f"<SLAPause {self.id} for Ticket {self.ticket_id}>"