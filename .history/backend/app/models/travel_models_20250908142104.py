"""
Travel history data models
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class TravelSourceType(str, Enum):
    """Travel data source types"""
    PASSPORT_STAMP = "passport_stamp"
    EMAIL = "email"
    FLIGHT_TRACKER = "flight_tracker"
    MANUAL = "manual"


class TravelEntryCreate(BaseModel):
    """Travel entry creation model"""
    departure_date: datetime
    return_date: datetime
    destination_country: str
    destination_city: Optional[str] = None
    purpose: Optional[str] = None
    source_type: TravelSourceType
    source_id: Optional[str] = None


class TravelEntryUpdate(BaseModel):
    """Travel entry update model"""
    departure_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    destination_country: Optional[str] = None
    destination_city: Optional[str] = None
    purpose: Optional[str] = None
    is_verified: Optional[bool] = None
    verification_notes: Optional[str] = None


class TravelEntryResponse(BaseModel):
    """Travel entry response model"""
    id: str
    departure_date: datetime
    return_date: datetime
    destination_country: str
    destination_city: Optional[str] = None
    purpose: Optional[str] = None
    source_type: TravelSourceType
    source_id: Optional[str] = None
    confidence_score: Optional[int] = None
    is_verified: bool
    verification_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class TravelHistorySummary(BaseModel):
    """Travel history summary model"""
    total_trips: int
    total_days_abroad: int
    countries_visited: List[str]
    date_range: Dict[str, datetime]
    source_breakdown: Dict[str, int]
    verification_status: Dict[str, int]


class TravelHistoryRequest(BaseModel):
    """Travel history request model"""
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    include_unverified: bool = True
    group_by_country: bool = False


class TravelHistoryResponse(BaseModel):
    """Travel history response model"""
    entries: List[TravelEntryResponse]
    summary: TravelHistorySummary
    generated_at: datetime


class TravelValidationRequest(BaseModel):
    """Travel validation request model"""
    entry_id: str
    is_valid: bool
    notes: Optional[str] = None


class TravelValidationResponse(BaseModel):
    """Travel validation response model"""
    entry_id: str
    is_valid: bool
    notes: Optional[str] = None
    validated_at: datetime
