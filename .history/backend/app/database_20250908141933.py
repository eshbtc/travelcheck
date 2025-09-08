"""
Database configuration and models
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from app.config import settings

# Database engine
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    travel_entries = relationship("TravelEntry", back_populates="user")
    email_accounts = relationship("EmailAccount", back_populates="user")
    reports = relationship("Report", back_populates="user")


class EmailAccount(Base):
    """Email account integration model"""
    __tablename__ = "email_accounts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    provider = Column(String, nullable=False)  # 'gmail' or 'office365'
    email = Column(String, nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="email_accounts")
    email_messages = relationship("EmailMessage", back_populates="email_account")


class EmailMessage(Base):
    """Email message model for flight confirmations"""
    __tablename__ = "email_messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email_account_id = Column(String, ForeignKey("email_accounts.id"), nullable=False)
    message_id = Column(String, nullable=False)  # Provider's message ID
    subject = Column(String, nullable=False)
    sender = Column(String, nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=False)
    body = Column(Text, nullable=True)
    parsed_data = Column(JSON, nullable=True)  # Extracted flight information
    is_flight_confirmation = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    email_account = relationship("EmailAccount", back_populates="email_messages")


class PassportImage(Base):
    """Passport image upload model"""
    __tablename__ = "passport_images"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String, nullable=False)
    ocr_results = Column(JSON, nullable=True)
    processing_status = Column(String, default="pending")  # pending, processing, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")


class TravelEntry(Base):
    """Travel entry model"""
    __tablename__ = "travel_entries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Travel details
    departure_date = Column(DateTime(timezone=True), nullable=False)
    return_date = Column(DateTime(timezone=True), nullable=False)
    destination_country = Column(String, nullable=False)
    destination_city = Column(String, nullable=True)
    purpose = Column(String, nullable=True)  # business, pleasure, etc.
    
    # Data sources
    source_type = Column(String, nullable=False)  # 'passport_stamp', 'email', 'flight_tracker', 'manual'
    source_id = Column(String, nullable=True)  # Reference to source record
    confidence_score = Column(Integer, nullable=True)  # 0-100
    
    # Validation
    is_verified = Column(Boolean, default=False)
    verification_notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="travel_entries")


class Report(Base):
    """Generated report model"""
    __tablename__ = "reports"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Report details
    report_type = Column(String, nullable=False)  # 'uscis', 'custom'
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Report data
    travel_entries = Column(JSON, nullable=False)  # Serialized travel entries
    summary_stats = Column(JSON, nullable=True)  # Total trips, countries, etc.
    
    # File information
    file_path = Column(String, nullable=True)
    file_format = Column(String, nullable=True)  # 'pdf', 'excel', 'csv'
    
    # Status
    status = Column(String, default="generating")  # generating, completed, failed
    generated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="reports")


# Dependency to get database session
def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
