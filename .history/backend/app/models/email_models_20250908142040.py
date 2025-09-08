"""
Email-related data models
"""

from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any


class EmailMessage(BaseModel):
    """Email message model"""
    message_id: str
    subject: str
    sender: str
    received_at: datetime
    body: str
    parsed_data: Optional[Dict[str, Any]] = None


class FlightConfirmation(BaseModel):
    """Flight confirmation data model"""
    email_id: str
    flight_number: Optional[str] = None
    departure_date: Optional[str] = None
    departure_time: Optional[str] = None
    arrival_date: Optional[str] = None
    arrival_time: Optional[str] = None
    departure_airport: Optional[str] = None
    arrival_airport: Optional[str] = None
    airline: Optional[str] = None
    passenger_name: Optional[str] = None
    booking_reference: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class EmailAccountCreate(BaseModel):
    """Email account creation model"""
    provider: str  # 'gmail' or 'office365'
    email: EmailStr


class EmailAccountResponse(BaseModel):
    """Email account response model"""
    id: str
    provider: str
    email: str
    is_active: bool
    created_at: datetime


class EmailSyncRequest(BaseModel):
    """Email sync request model"""
    account_id: str
    max_results: int = 100
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class EmailSyncResponse(BaseModel):
    """Email sync response model"""
    account_id: str
    messages_processed: int
    flight_confirmations_found: int
    sync_completed_at: datetime
    errors: Optional[List[str]] = None
