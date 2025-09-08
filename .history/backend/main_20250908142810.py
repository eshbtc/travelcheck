"""
Travel History Tracker - Main FastAPI Application for Google Cloud
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
import firebase_admin
from firebase_admin import credentials

from app.routers import auth, email, ocr, travel_history, reports
from app.firestore_models import db
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    print("🚀 Starting Travel History Tracker API on Google Cloud...")
    
    # Initialize Firebase Admin SDK
    if not firebase_admin._apps:
        try:
            if settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL:
                # Use service account credentials
                cred_dict = {
                    "type": "service_account",
                    "project_id": settings.FIREBASE_PROJECT_ID,
                    "private_key_id": "key_id",
                    "private_key": settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
                    "client_email": settings.FIREBASE_CLIENT_EMAIL,
                    "client_id": "client_id",
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                cred = credentials.Certificate(cred_dict)
            else:
                # Use default credentials
                cred = credentials.ApplicationDefault()
            
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized")
        except Exception as e:
            print(f"⚠️ Firebase initialization warning: {e}")
    
    # Test Firestore connection
    try:
        # Test Firestore connection
        test_collection = db.get_collection('health_check')
        print("✅ Firestore connection established")
    except Exception as e:
        print(f"⚠️ Firestore connection warning: {e}")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Travel History Tracker API...")


# Initialize FastAPI app
app = FastAPI(
    title="Travel History Tracker API",
    description="API for compiling travel history from passport stamps, emails, and flight data",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(email.router, prefix="/api/v1/email", tags=["Email Integration"])
app.include_router(ocr.router, prefix="/api/v1/ocr", tags=["OCR Processing"])
app.include_router(travel_history.router, prefix="/api/v1/travel", tags=["Travel History"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Travel History Tracker API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
