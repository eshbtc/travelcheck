"""
Firestore models for Google Cloud deployment
"""

from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid

from app.config import settings


class FirestoreDB:
    """Firestore database client"""
    
    def __init__(self):
        self.db = firestore.Client(
            project=settings.GOOGLE_CLOUD_PROJECT,
            database=settings.FIRESTORE_DATABASE_ID
        )
    
    def get_collection(self, collection_name: str):
        """Get a Firestore collection reference"""
        return self.db.collection(collection_name)
    
    def get_document(self, collection_name: str, document_id: str):
        """Get a Firestore document reference"""
        return self.db.collection(collection_name).document(document_id)


# Global database instance
db = FirestoreDB()


class BaseModel:
    """Base model for Firestore documents"""
    
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary for Firestore"""
        data = {}
        for key, value in self.__dict__.items():
            if not key.startswith('_'):
                if isinstance(value, datetime):
                    data[key] = value
                else:
                    data[key] = value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        """Create model from Firestore document data"""
        return cls(**data)


class User(BaseModel):
    """User model for Firestore"""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.email = kwargs.get('email')
        self.full_name = kwargs.get('full_name')
        self.is_active = kwargs.get('is_active', True)
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', datetime.utcnow())
        self.firebase_uid = kwargs.get('firebase_uid')
        super().__init__(**kwargs)


class EmailAccount(BaseModel):
    """Email account integration model for Firestore"""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.user_id = kwargs.get('user_id')
        self.provider = kwargs.get('provider')  # 'gmail' or 'office365'
        self.email = kwargs.get('email')
        self.access_token = kwargs.get('access_token')
        self.refresh_token = kwargs.get('refresh_token')
        self.token_expires_at = kwargs.get('token_expires_at')
        self.is_active = kwargs.get('is_active', True)
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', datetime.utcnow())
        super().__init__(**kwargs)


class TravelEntry(BaseModel):
    """Travel entry model for Firestore"""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.user_id = kwargs.get('user_id')
        self.departure_date = kwargs.get('departure_date')
        self.return_date = kwargs.get('return_date')
        self.destination_country = kwargs.get('destination_country')
        self.destination_city = kwargs.get('destination_city')
        self.purpose = kwargs.get('purpose')
        self.source_type = kwargs.get('source_type')  # 'passport_stamp', 'email', 'flight_tracker', 'manual'
        self.source_id = kwargs.get('source_id')
        self.confidence_score = kwargs.get('confidence_score')
        self.is_verified = kwargs.get('is_verified', False)
        self.verification_notes = kwargs.get('verification_notes')
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', datetime.utcnow())
        super().__init__(**kwargs)


class PassportImage(BaseModel):
    """Passport image model for Firestore"""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.user_id = kwargs.get('user_id')
        self.filename = kwargs.get('filename')
        self.gcs_path = kwargs.get('gcs_path')  # Google Cloud Storage path
        self.file_size = kwargs.get('file_size')
        self.mime_type = kwargs.get('mime_type')
        self.ocr_results = kwargs.get('ocr_results')
        self.processing_status = kwargs.get('processing_status', 'pending')
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        super().__init__(**kwargs)


class Report(BaseModel):
    """Generated report model for Firestore"""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.user_id = kwargs.get('user_id')
        self.report_type = kwargs.get('report_type')  # 'uscis', 'custom'
        self.title = kwargs.get('title')
        self.description = kwargs.get('description')
        self.travel_entries = kwargs.get('travel_entries')
        self.summary_stats = kwargs.get('summary_stats')
        self.gcs_file_path = kwargs.get('gcs_file_path')  # Google Cloud Storage path
        self.file_format = kwargs.get('file_format')  # 'pdf', 'excel', 'csv'
        self.status = kwargs.get('status', 'generating')  # 'generating', 'completed', 'failed'
        self.generated_at = kwargs.get('generated_at')
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        super().__init__(**kwargs)


# Database operations
class DatabaseOperations:
    """Database operations for Firestore"""
    
    def __init__(self):
        self.db = db
    
    async def create_user(self, user_data: Dict[str, Any]) -> User:
        """Create a new user in Firestore"""
        user = User(**user_data)
        doc_ref = self.db.get_document('users', user.id)
        doc_ref.set(user.to_dict())
        return user
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        doc_ref = self.db.get_document('users', user_id)
        doc = doc_ref.get()
        if doc.exists:
            return User.from_dict(doc.to_dict())
        return None
    
    async def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        """Get user by Firebase UID"""
        users_ref = self.db.get_collection('users')
        query = users_ref.where(filter=FieldFilter('firebase_uid', '==', firebase_uid))
        docs = query.stream()
        for doc in docs:
            return User.from_dict(doc.to_dict())
        return None
    
    async def create_travel_entry(self, entry_data: Dict[str, Any]) -> TravelEntry:
        """Create travel entry"""
        entry = TravelEntry(**entry_data)
        doc_ref = self.db.get_document('travel_entries', entry.id)
        doc_ref.set(entry.to_dict())
        return entry
    
    async def get_user_travel_entries(self, user_id: str, limit: int = 100) -> List[TravelEntry]:
        """Get user's travel entries"""
        entries_ref = self.db.get_collection('travel_entries')
        query = entries_ref.where(filter=FieldFilter('user_id', '==', user_id)).limit(limit)
        docs = query.stream()
        return [TravelEntry.from_dict(doc.to_dict()) for doc in docs]


# Global database operations instance
db_ops = DatabaseOperations()
