"""
OCR processing router
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
import aiofiles
import os
from datetime import datetime

from app.database import get_db
from app.services.auth_service import AuthService
from app.services.ocr_service import OCRService
from app.models.ocr_models import (
    PassportImageResponse, OCRProcessingRequest, OCRProcessingResponse
)
from app.config import settings

router = APIRouter()
security = HTTPBearer()
auth_service = AuthService()
ocr_service = OCRService()


@router.post("/upload", response_model=PassportImageResponse)
async def upload_passport_image(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Upload passport image for OCR processing"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        
        # Validate file type
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only JPEG, PNG, and TIFF images are allowed."
            )
        
        # Validate file size
        if file.size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 10MB."
            )
        
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join(settings.UPLOAD_DIR, user.id)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(upload_dir, filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Create database record
        passport_image = await ocr_service.create_passport_image_record(
            db, user.id, filename, file_path, file.size, file.content_type
        )
        
        return PassportImageResponse(
            id=passport_image.id,
            filename=passport_image.filename,
            processing_status=passport_image.processing_status,
            stamps_found=0,  # Will be updated after processing
            created_at=passport_image.created_at
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/process/{image_id}", response_model=OCRProcessingResponse)
async def process_passport_image(
    image_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Process passport image with OCR"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        
        # Get image record
        passport_image = await ocr_service.get_passport_image(db, user.id, image_id)
        if not passport_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Passport image not found"
            )
        
        # Process image
        start_time = datetime.now()
        stamps = await ocr_service.process_passport_image(passport_image.file_path)
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Update database record
        await ocr_service.update_passport_image_results(
            db, passport_image.id, stamps, "completed"
        )
        
        return OCRProcessingResponse(
            image_id=image_id,
            processing_status="completed",
            stamps_extracted=stamps,
            processing_time=processing_time
        )
        
    except Exception as e:
        # Update status to failed
        await ocr_service.update_passport_image_results(
            db, image_id, [], "failed"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/images", response_model=List[PassportImageResponse])
async def get_passport_images(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get user's uploaded passport images"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        images = await ocr_service.get_user_passport_images(db, user.id)
        return images
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.get("/images/{image_id}/stamps")
async def get_image_stamps(
    image_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get extracted stamps from a passport image"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        stamps = await ocr_service.get_image_stamps(db, user.id, image_id)
        return {"stamps": stamps}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/images/{image_id}")
async def delete_passport_image(
    image_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete passport image and its data"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        await ocr_service.delete_passport_image(db, user.id, image_id)
        return {"message": "Passport image deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
