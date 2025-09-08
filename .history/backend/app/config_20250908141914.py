"""
Configuration settings for the Travel History Tracker application
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Travel History Tracker"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/travel_history"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://travelcheck.com"
    ]
    
    # Email APIs
    GMAIL_CLIENT_ID: Optional[str] = None
    GMAIL_CLIENT_SECRET: Optional[str] = None
    GMAIL_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/gmail/callback"
    
    OFFICE365_CLIENT_ID: Optional[str] = None
    OFFICE365_CLIENT_SECRET: Optional[str] = None
    OFFICE365_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/office365/callback"
    
    # OCR Settings
    TESSERACT_PATH: Optional[str] = None  # Path to tesseract executable
    OCR_CONFIDENCE_THRESHOLD: float = 0.7
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/tiff"]
    
    # Flight Tracking APIs
    FLIGHTY_API_KEY: Optional[str] = None
    FLIGHTRADAR24_API_KEY: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
