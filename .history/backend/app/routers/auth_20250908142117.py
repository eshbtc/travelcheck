"""
Authentication router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.services.auth_service import AuthService
from app.models.auth_models import UserCreate, UserLogin, TokenResponse, UserResponse

router = APIRouter()
security = HTTPBearer()
auth_service = AuthService()


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        user = await auth_service.create_user(db, user_data)
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            created_at=user.created_at
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token"""
    try:
        token_data = await auth_service.authenticate_user(db, login_data)
        return TokenResponse(**token_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current user information"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            created_at=user.created_at
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.post("/gmail/authorize")
async def authorize_gmail(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get Gmail authorization URL"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        auth_url = await auth_service.get_gmail_auth_url(user.id)
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.post("/gmail/callback")
async def gmail_callback(
    code: str,
    state: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Handle Gmail OAuth callback"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        result = await auth_service.handle_gmail_callback(db, user.id, code)
        return {"message": "Gmail account connected successfully", "account_id": result["account_id"]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/office365/authorize")
async def authorize_office365(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get Office365 authorization URL"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        auth_url = await auth_service.get_office365_auth_url(user.id)
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.post("/office365/callback")
async def office365_callback(
    code: str,
    state: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Handle Office365 OAuth callback"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        result = await auth_service.handle_office365_callback(db, user.id, code)
        return {"message": "Office365 account connected successfully", "account_id": result["account_id"]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
