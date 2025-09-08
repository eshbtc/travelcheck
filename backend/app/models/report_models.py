"""
Report generation data models
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class ReportType(str, Enum):
    """Report type enumeration"""
    USCIS = "uscis"
    CUSTOM = "custom"
    SUMMARY = "summary"


class ReportFormat(str, Enum):
    """Report format enumeration"""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"


class ReportStatus(str, Enum):
    """Report status enumeration"""
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class ReportCreate(BaseModel):
    """Report creation model"""
    report_type: ReportType
    title: str
    description: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    include_unverified: bool = True
    format: ReportFormat = ReportFormat.PDF


class ReportResponse(BaseModel):
    """Report response model"""
    id: str
    report_type: ReportType
    title: str
    description: Optional[str] = None
    status: ReportStatus
    file_path: Optional[str] = None
    file_format: Optional[ReportFormat] = None
    generated_at: Optional[datetime] = None
    created_at: datetime


class ReportListResponse(BaseModel):
    """Report list response model"""
    id: str
    title: str
    report_type: ReportType
    status: ReportStatus
    created_at: datetime
    generated_at: Optional[datetime] = None


class USCISTemplate(BaseModel):
    """USCIS template information"""
    form_name: str = "Form N-400"
    section: str = "Part 9 - Time Outside the United States"
    requirements: List[str]
    instructions: List[str]
    example_format: Dict[str, Any]
