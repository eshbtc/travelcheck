"""
Travel history router
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.services.auth_service import AuthService
from app.services.travel_service import TravelService
from app.models.travel_models import (
    TravelEntryCreate, TravelEntryUpdate, TravelEntryResponse,
    TravelHistoryRequest, TravelHistoryResponse, TravelValidationRequest
)

router = APIRouter()
security = HTTPBearer()
auth_service = AuthService()
travel_service = TravelService()


@router.post("/entries", response_model=TravelEntryResponse)
async def create_travel_entry(
    entry_data: TravelEntryCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create a new travel entry"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        entry = await travel_service.create_travel_entry(db, user.id, entry_data)
        return TravelEntryResponse(**entry.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/entries", response_model=List[TravelEntryResponse])
async def get_travel_entries(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    include_unverified: bool = Query(True),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get user's travel entries"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        entries = await travel_service.get_travel_entries(
            db, user.id, date_from, date_to, include_unverified
        )
        return [TravelEntryResponse(**entry.dict()) for entry in entries]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/entries/{entry_id}", response_model=TravelEntryResponse)
async def get_travel_entry(
    entry_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get a specific travel entry"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        entry = await travel_service.get_travel_entry(db, user.id, entry_id)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Travel entry not found"
            )
        return TravelEntryResponse(**entry.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/entries/{entry_id}", response_model=TravelEntryResponse)
async def update_travel_entry(
    entry_id: str,
    entry_data: TravelEntryUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update a travel entry"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        entry = await travel_service.update_travel_entry(db, user.id, entry_id, entry_data)
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Travel entry not found"
            )
        return TravelEntryResponse(**entry.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/entries/{entry_id}")
async def delete_travel_entry(
    entry_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete a travel entry"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        success = await travel_service.delete_travel_entry(db, user.id, entry_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Travel entry not found"
            )
        return {"message": "Travel entry deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/history", response_model=TravelHistoryResponse)
async def get_travel_history(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    include_unverified: bool = Query(True),
    group_by_country: bool = Query(False),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get comprehensive travel history"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        history_request = TravelHistoryRequest(
            date_from=date_from,
            date_to=date_to,
            include_unverified=include_unverified,
            group_by_country=group_by_country
        )
        history = await travel_service.get_travel_history(db, user.id, history_request)
        return history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/summary")
async def get_travel_summary(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get travel history summary statistics"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        summary = await travel_service.get_travel_summary(db, user.id)
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/validate")
async def validate_travel_entry(
    validation_data: TravelValidationRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Validate or reject a travel entry"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        result = await travel_service.validate_travel_entry(
            db, user.id, validation_data
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/auto-generate")
async def auto_generate_entries(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Auto-generate travel entries from connected data sources"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        result = await travel_service.auto_generate_entries(db, user.id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
