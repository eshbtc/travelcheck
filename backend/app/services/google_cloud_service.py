"""
Google Cloud services integration
"""

import os
import io
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
from google.cloud import storage, vision, aiplatform
from google.cloud.aiplatform import gapic as aip
import vertexai
from vertexai.generative_models import GenerativeModel, Part
import firebase_admin
from firebase_admin import credentials, auth, app_check
from google.oauth2 import service_account
import json

from app.config import settings


class GoogleCloudService:
    """Google Cloud services integration"""
    
    def __init__(self):
        self.project_id = settings.GOOGLE_CLOUD_PROJECT
        self.location = settings.VERTEX_AI_LOCATION
        
        # Initialize services
        self._init_firebase()
        self._init_storage()
        self._init_vision()
        self._init_vertex_ai()
    
    def _init_firebase(self):
        """Initialize Firebase Admin SDK"""
        if not firebase_admin._apps:
            if settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL:
                # Use service account credentials
                cred_dict = {
                    "type": "service_account",
                    "project_id": settings.FIREBASE_PROJECT_ID,
                    "private_key_id": "key_id",
                    "private_key": settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
                    "client_email": settings.FIREBASE_CLIENT_EMAIL,
                    "client_id": "client_id",
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                cred = credentials.Certificate(cred_dict)
            else:
                # Use default credentials
                cred = credentials.ApplicationDefault()
            
            firebase_admin.initialize_app(cred)
    
    def _init_storage(self):
        """Initialize Google Cloud Storage"""
        self.storage_client = storage.Client(project=self.project_id)
        self.bucket = self.storage_client.bucket(settings.GCS_BUCKET_NAME)
    
    def _init_vision(self):
        """Initialize Google Cloud Vision API"""
        self.vision_client = vision.ImageAnnotatorClient()
    
    def _init_vertex_ai(self):
        """Initialize Vertex AI"""
        vertexai.init(project=self.project_id, location=self.location)
        self.gemini_model = GenerativeModel(settings.VERTEX_AI_MODEL_NAME)
    
    async def upload_file_to_gcs(self, file_data: bytes, filename: str, content_type: str) -> str:
        """Upload file to Google Cloud Storage"""
        blob_name = f"uploads/{datetime.now().strftime('%Y/%m/%d')}/{filename}"
        blob = self.bucket.blob(blob_name)
        
        blob.upload_from_string(
            file_data,
            content_type=content_type
        )
        
        return f"gs://{settings.GCS_BUCKET_NAME}/{blob_name}"
    
    async def download_file_from_gcs(self, gcs_path: str) -> bytes:
        """Download file from Google Cloud Storage"""
        blob_name = gcs_path.replace(f"gs://{settings.GCS_BUCKET_NAME}/", "")
        blob = self.bucket.blob(blob_name)
        return blob.download_as_bytes()
    
    async def delete_file_from_gcs(self, gcs_path: str) -> bool:
        """Delete file from Google Cloud Storage"""
        try:
            blob_name = gcs_path.replace(f"gs://{settings.GCS_BUCKET_NAME}/", "")
            blob = self.bucket.blob(blob_name)
            blob.delete()
            return True
        except Exception:
            return False
    
    async def process_image_with_vision(self, image_data: bytes) -> Dict[str, Any]:
        """Process image with Google Cloud Vision API"""
        image = vision.Image(content=image_data)
        
        # Perform text detection
        response = self.vision_client.text_detection(image=image)
        texts = response.text_annotations
        
        if response.error.message:
            raise Exception(f"Vision API error: {response.error.message}")
        
        # Extract text and bounding boxes
        extracted_text = ""
        if texts:
            extracted_text = texts[0].description
        
        # Get confidence scores
        confidence_scores = []
        for text in texts[1:]:  # Skip the first one (full text)
            confidence_scores.append(text.score)
        
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
        
        return {
            "text": extracted_text,
            "confidence": avg_confidence,
            "text_annotations": [
                {
                    "text": text.description,
                    "bounding_poly": [
                        {"x": vertex.x, "y": vertex.y} 
                        for vertex in text.bounding_poly.vertices
                    ],
                    "confidence": text.score
                }
                for text in texts[1:]
            ]
        }
    
    async def process_image_with_gemini(self, image_data: bytes, prompt: str) -> Dict[str, Any]:
        """Process image with Gemini AI model"""
        try:
            # Convert bytes to Part
            image_part = Part.from_data(
                data=image_data,
                mime_type="image/jpeg"
            )
            
            # Generate content
            response = self.gemini_model.generate_content([image_part, prompt])
            
            return {
                "text": response.text,
                "confidence": 0.9,  # Gemini doesn't provide confidence scores
                "model": settings.VERTEX_AI_MODEL_NAME
            }
        except Exception as e:
            raise Exception(f"Gemini processing error: {str(e)}")
    
    async def verify_firebase_token(self, token: str) -> Dict[str, Any]:
        """Verify Firebase ID token"""
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            raise Exception(f"Token verification failed: {str(e)}")
    
    async def verify_app_check_token(self, token: str) -> Dict[str, Any]:
        """Verify Firebase App Check token"""
        try:
            if not settings.APP_CHECK_ENABLED:
                return {"verified": True}
            
            verified_token = app_check.verify_token(token)
            return verified_token
        except Exception as e:
            raise Exception(f"App Check verification failed: {str(e)}")
    
    async def extract_passport_stamp_data(self, image_data: bytes) -> Dict[str, Any]:
        """Extract passport stamp data using AI"""
        prompt = """
        Analyze this passport stamp image and extract the following information:
        1. Country name
        2. City name (if visible)
        3. Entry date
        4. Exit date (if visible)
        5. Airport code (if visible)
        6. Stamp type (entry/exit/transit)
        
        Return the information in JSON format with these fields:
        - country: string
        - city: string (optional)
        - entry_date: string (YYYY-MM-DD format)
        - exit_date: string (YYYY-MM-DD format, optional)
        - airport_code: string (optional)
        - stamp_type: string (entry/exit/transit)
        - confidence: number (0-1)
        
        If any information is not clearly visible, use null for that field.
        """
        
        try:
            # Try Gemini first for better accuracy
            result = await self.process_image_with_gemini(image_data, prompt)
            
            # Parse JSON response
            import json
            try:
                parsed_data = json.loads(result["text"])
                return parsed_data
            except json.JSONDecodeError:
                # Fallback to Vision API if Gemini response is not JSON
                vision_result = await self.process_image_with_vision(image_data)
                return self._parse_stamp_text_vision(vision_result["text"])
                
        except Exception as e:
            # Fallback to Vision API
            vision_result = await self.process_image_with_vision(image_data)
            return self._parse_stamp_text_vision(vision_result["text"])
    
    def _parse_stamp_text_vision(self, text: str) -> Dict[str, Any]:
        """Parse stamp text from Vision API result"""
        import re
        from datetime import datetime
        
        # Common patterns for passport stamps
        patterns = {
            'date': r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            'airport_code': r'([A-Z]{3})',
            'country': r'(UNITED STATES|CANADA|MEXICO|UNITED KINGDOM|FRANCE|GERMANY|ITALY|SPAIN|JAPAN|CHINA|AUSTRALIA)',
            'entry_exit': r'(ENTRY|EXIT|ARRIVAL|DEPARTURE)',
        }
        
        extracted_data = {
            "country": None,
            "city": None,
            "entry_date": None,
            "exit_date": None,
            "airport_code": None,
            "stamp_type": "unknown",
            "confidence": 0.5
        }
        
        # Extract dates
        dates = re.findall(patterns['date'], text)
        if dates:
            try:
                date_str = dates[0]
                # Try to parse the date
                for fmt in ['%m/%d/%Y', '%m/%d/%y', '%d/%m/%Y', '%d/%m/%y']:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt)
                        if 'ENTRY' in text.upper() or 'ARRIVAL' in text.upper():
                            extracted_data['entry_date'] = parsed_date.strftime('%Y-%m-%d')
                        elif 'EXIT' in text.upper() or 'DEPARTURE' in text.upper():
                            extracted_data['exit_date'] = parsed_date.strftime('%Y-%m-%d')
                        else:
                            extracted_data['entry_date'] = parsed_date.strftime('%Y-%m-%d')
                        break
                    except ValueError:
                        continue
            except Exception:
                pass
        
        # Extract country
        country_match = re.search(patterns['country'], text, re.IGNORECASE)
        if country_match:
            extracted_data['country'] = country_match.group(1).title()
        
        # Extract airport code
        airport_match = re.search(patterns['airport_code'], text)
        if airport_match:
            extracted_data['airport_code'] = airport_match.group(1)
        
        # Determine stamp type
        if 'ENTRY' in text.upper() or 'ARRIVAL' in text.upper():
            extracted_data['stamp_type'] = 'entry'
        elif 'EXIT' in text.upper() or 'DEPARTURE' in text.upper():
            extracted_data['stamp_type'] = 'exit'
        
        return extracted_data


# Global Google Cloud service instance
google_cloud_service = GoogleCloudService()
