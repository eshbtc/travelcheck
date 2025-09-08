"""
Configuration settings for the Travel History Tracker application using Google Cloud services
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings for Google Cloud deployment"""
    
    # Application
    APP_NAME: str = "Travel History Tracker"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Google Cloud Project
    GOOGLE_CLOUD_PROJECT: str = "your-project-id"
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    
    # Firebase Configuration
    FIREBASE_PROJECT_ID: str = "your-firebase-project-id"
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    FIREBASE_CLIENT_EMAIL: Optional[str] = None
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Firestore Database
    FIRESTORE_DATABASE_ID: str = "(default)"
    
    # Google Cloud Storage
    GCS_BUCKET_NAME: str = "travel-history-uploads"
    GCS_BUCKET_REGION: str = "us-central1"
    
    # Google Cloud Vision API
    VISION_API_ENABLED: bool = True
    VISION_CONFIDENCE_THRESHOLD: float = 0.7
    
    # Google AI Studio / Vertex AI
    VERTEX_AI_LOCATION: str = "us-central1"
    VERTEX_AI_MODEL_NAME: str = "gemini-pro-vision"
    
    # Email APIs
    GMAIL_CLIENT_ID: Optional[str] = None
    GMAIL_CLIENT_SECRET: Optional[str] = None
    GMAIL_REDIRECT_URI: str = "https://your-domain.com/api/v1/auth/gmail/callback"
    
    OFFICE365_CLIENT_ID: Optional[str] = None
    OFFICE365_CLIENT_SECRET: Optional[str] = None
    OFFICE365_REDIRECT_URI: str = "https://your-domain.com/api/v1/auth/office365/callback"
    
    # File Storage
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/tiff"]
    
    # Flight Tracking APIs
    FLIGHTY_API_KEY: Optional[str] = None
    FLIGHTRADAR24_API_KEY: Optional[str] = None
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "https://your-firebase-project.web.app",
        "https://your-firebase-project.firebaseapp.com",
        "http://localhost:3000",
        "http://localhost:3001"
    ]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # App Check
    APP_CHECK_ENABLED: bool = True
    RECAPTCHA_SITE_KEY: Optional[str] = None
    
    # Cloud Run
    PORT: int = 8080
    HOST: str = "0.0.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()