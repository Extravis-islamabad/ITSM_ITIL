from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    value_type = Column(String(20), default="string")  # string, number, boolean, json
    category = Column(String(50), nullable=False)  # company, tickets, sla, email, security
    description = Column(Text, nullable=True)
    is_sensitive = Column(Boolean, default=False)  # Hide value in responses if sensitive

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<SystemSettings {self.key}={self.value}>"

    def get_typed_value(self):
        """Return the value converted to its proper type"""
        if self.value is None:
            return None
        if self.value_type == "number":
            return int(self.value) if '.' not in self.value else float(self.value)
        elif self.value_type == "boolean":
            return self.value.lower() in ('true', '1', 'yes')
        elif self.value_type == "json":
            import json
            return json.loads(self.value)
        return self.value
