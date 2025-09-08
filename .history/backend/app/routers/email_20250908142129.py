"""
Email integration router
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.models.email_models import (
    EmailAccountResponse, EmailSyncRequest, EmailSyncResponse
)

router = APIRouter()
security = HTTPBearer()
auth_service = AuthService()
email_service = EmailService()


@router.get("/accounts", response_model=List[EmailAccountResponse])
async def get_email_accounts(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get user's connected email accounts"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        accounts = await email_service.get_user_email_accounts(db, user.id)
        return accounts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.post("/sync", response_model=EmailSyncResponse)
async def sync_emails(
    sync_request: EmailSyncRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Sync emails from connected accounts"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        result = await email_service.sync_user_emails(db, user.id, sync_request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/messages")
async def get_email_messages(
    account_id: str,
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get email messages from a specific account"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        messages = await email_service.get_account_messages(db, user.id, account_id, limit)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/flight-confirmations")
async def get_flight_confirmations(
    account_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get parsed flight confirmations from email account"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        confirmations = await email_service.get_flight_confirmations(db, user.id, account_id)
        return {"flight_confirmations": confirmations}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/accounts/{account_id}")
async def disconnect_email_account(
    account_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Disconnect an email account"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        await email_service.disconnect_account(db, user.id, account_id)
        return {"message": "Email account disconnected successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
