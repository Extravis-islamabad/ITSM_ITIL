from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "ITSM Platform"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Email Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "noreply@supportx.com"
    EMAIL_FROM_NAME: str = "SupportX"
    
    # Frontend Settings
    FRONTEND_URL: str = "http://localhost:5173"
    APP_URL: str = "http://localhost:5173"  # ✅ Add this for email links
    
    # Company Info (for emails)
    COMPANY_NAME: str = "SupportX"  # ✅ Add this
    SUPPORT_EMAIL: str = "support@supportx.com"  # ✅ Add this
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # ✅ Add this to allow extra fields
    
    def get_allowed_origins(self) -> List[str]:
        origins = []
        if isinstance(self.ALLOWED_ORIGINS, str):
            origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(',') if origin.strip()]
        else:
            origins = self.ALLOWED_ORIGINS

        # In production, also add the frontend URL if configured
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)

        return origins

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()