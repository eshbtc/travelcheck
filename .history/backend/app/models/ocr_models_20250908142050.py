"""
OCR-related data models
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any


class PassportStamp(BaseModel):
    """Passport stamp data model"""
    text: str
    confidence: float
    country: Optional[str] = None
    city: Optional[str] = None
    entry_date: Optional[datetime] = None
    exit_date: Optional[datetime] = None
    stamp_type: Optional[str] = None  # 'entry', 'exit', 'unknown'
    airport_code: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class StampData(BaseModel):
    """Structured stamp data"""
    country: str
    city: Optional[str] = None
    entry_date: datetime
    exit_date: Optional[datetime] = None
    airport_code: Optional[str] = None
    stamp_type: str
    confidence_score: float


class PassportImageUpload(BaseModel):
    """Passport image upload model"""
    filename: str
    file_size: int
    mime_type: str


class PassportImageResponse(BaseModel):
    """Passport image response model"""
    id: str
    filename: str
    processing_status: str
    stamps_found: int
    created_at: datetime
    ocr_results: Optional[Dict[str, Any]] = None


class OCRProcessingRequest(BaseModel):
    """OCR processing request model"""
    image_id: str
    enhance_image: bool = True
    confidence_threshold: float = 0.7


class OCRProcessingResponse(BaseModel):
    """OCR processing response model"""
    image_id: str
    processing_status: str
    stamps_extracted: List[PassportStamp]
    processing_time: float
    errors: Optional[List[str]] = None
