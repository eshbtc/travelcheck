"""
Authentication service
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.config import settings
from app.database import User, EmailAccount
from app.models.auth_models import UserCreate, UserLogin
from app.services.email_service import EmailService

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
email_service = EmailService()


class AuthService:
    """Authentication service"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None
    
    async def create_user(self, db: Session, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = self.get_password_hash(user_data.password)
        user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    
    async def authenticate_user(self, db: Session, login_data: UserLogin) -> Dict[str, Any]:
        """Authenticate user and return token"""
        user = db.query(User).filter(User.email == login_data.email).first()
        
        if not user or not self.verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is disabled"
            )
        
        # Create access token
        access_token = self.create_access_token(data={"sub": user.id})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "created_at": user.created_at
            }
        }
    
    async def get_current_user(self, db: Session, token: str) -> User:
        """Get current user from token"""
        payload = self.verify_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
    
    async def get_gmail_auth_url(self, user_id: str) -> str:
        """Get Gmail authorization URL"""
        return await email_service.authenticate_gmail(user_id)
    
    async def handle_gmail_callback(self, db: Session, user_id: str, code: str) -> Dict[str, Any]:
        """Handle Gmail OAuth callback"""
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Handle OAuth callback
        result = await email_service.handle_gmail_callback(code)
        
        # Save email account
        email_account = EmailAccount(
            user_id=user_id,
            provider="gmail",
            email=result["email"],
            access_token=result["access_token"],
            refresh_token=result.get("refresh_token"),
            token_expires_at=result.get("expires_at")
        )
        
        db.add(email_account)
        db.commit()
        db.refresh(email_account)
        
        return {"account_id": email_account.id}
    
    async def get_office365_auth_url(self, user_id: str) -> str:
        """Get Office365 authorization URL"""
        return await email_service.authenticate_office365(user_id)
    
    async def handle_office365_callback(self, db: Session, user_id: str, code: str) -> Dict[str, Any]:
        """Handle Office365 OAuth callback"""
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Handle OAuth callback
        result = await email_service.handle_office365_callback(code)
        
        # Save email account
        email_account = EmailAccount(
            user_id=user_id,
            provider="office365",
            email=result["email"],
            access_token=result["access_token"],
            refresh_token=result.get("refresh_token"),
            token_expires_at=result.get("expires_at")
        )
        
        db.add(email_account)
        db.commit()
        db.refresh(email_account)
        
        return {"account_id": email_account.id}
