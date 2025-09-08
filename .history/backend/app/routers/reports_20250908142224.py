"""
Reports generation router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.services.auth_service import AuthService
from app.services.report_service import ReportService
from app.models.report_models import (
    ReportCreate, ReportResponse, ReportListResponse
)

router = APIRouter()
security = HTTPBearer()
auth_service = AuthService()
report_service = ReportService()


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    report_data: ReportCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Generate a new travel history report"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        report = await report_service.generate_report(db, user.id, report_data)
        return ReportResponse(**report.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=List[ReportListResponse])
async def get_reports(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get user's generated reports"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        reports = await report_service.get_user_reports(db, user.id)
        return [ReportListResponse(**report.dict()) for report in reports]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get a specific report"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        report = await report_service.get_report(db, user.id, report_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        return ReportResponse(**report.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    format: str = "pdf",
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Download a report in specified format"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        file_path = await report_service.download_report(db, user.id, report_id, format)
        
        if not file_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report file not found"
            )
        
        return FileResponse(
            path=file_path,
            filename=f"travel_history_{report_id}.{format}",
            media_type="application/pdf" if format == "pdf" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete a report"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        success = await report_service.delete_report(db, user.id, report_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        return {"message": "Report deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/templates/uscis")
async def get_uscis_template(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get USCIS travel history template information"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        template = await report_service.get_uscis_template()
        return template
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{report_id}/regenerate")
async def regenerate_report(
    report_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Regenerate an existing report with updated data"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        report = await report_service.regenerate_report(db, user.id, report_id)
        return ReportResponse(**report.dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
