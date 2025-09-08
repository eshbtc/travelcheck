"""
OCR service for passport stamp processing
"""

import cv2
import numpy as np
import pytesseract
from PIL import Image
import re
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import json

from app.config import settings
from app.models.ocr_models import PassportStamp, StampData


class OCRService:
    """Service for OCR processing of passport stamps"""
    
    def __init__(self):
        if settings.TESSERACT_PATH:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH
    
    async def process_passport_image(self, image_path: str) -> List[PassportStamp]:
        """Process passport image and extract stamp data"""
        # Load and preprocess image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect stamp regions
        stamp_regions = self._detect_stamp_regions(gray)
        
        stamps = []
        for region in stamp_regions:
            # Extract stamp image
            x, y, w, h = region
            stamp_image = gray[y:y+h, x:x+w]
            
            # Process individual stamp
            stamp_data = await self._process_stamp(stamp_image)
            if stamp_data:
                stamps.append(stamp_data)
        
        return stamps
    
    def _detect_stamp_regions(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect potential stamp regions in the image"""
        # Apply edge detection
        edges = cv2.Canny(image, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours by size and shape
        stamp_regions = []
        for contour in contours:
            # Get bounding rectangle
            x, y, w, h = cv2.boundingRect(contour)
            
            # Filter by size (stamps are typically rectangular and not too small/large)
            if 50 < w < 300 and 30 < h < 150:
                # Check aspect ratio (stamps are usually wider than tall)
                aspect_ratio = w / h
                if 1.5 < aspect_ratio < 5.0:
                    stamp_regions.append((x, y, w, h))
        
        return stamp_regions
    
    async def _process_stamp(self, stamp_image: np.ndarray) -> Optional[PassportStamp]:
        """Process individual stamp and extract data"""
        # Enhance image for better OCR
        enhanced_image = self._enhance_image_for_ocr(stamp_image)
        
        # Convert to PIL Image for tesseract
        pil_image = Image.fromarray(enhanced_image)
        
        # Run OCR with different configurations
        ocr_results = []
        
        # Try different OCR configurations
        configs = [
            '--psm 6',  # Uniform block of text
            '--psm 8',  # Single word
            '--psm 13', # Raw line
        ]
        
        for config in configs:
            try:
                text = pytesseract.image_to_string(pil_image, config=config)
                confidence = pytesseract.image_to_data(pil_image, config=config, output_type=pytesseract.Output.DICT)
                
                if text.strip():
                    ocr_results.append({
                        'text': text.strip(),
                        'confidence': np.mean([int(conf) for conf in confidence['conf'] if int(conf) > 0]),
                        'config': config
                    })
            except Exception as e:
                print(f"OCR failed with config {config}: {e}")
                continue
        
        if not ocr_results:
            return None
        
        # Select best result based on confidence
        best_result = max(ocr_results, key=lambda x: x['confidence'])
        
        if best_result['confidence'] < settings.OCR_CONFIDENCE_THRESHOLD * 100:
            return None
        
        # Parse the extracted text
        stamp_data = self._parse_stamp_text(best_result['text'])
        
        if stamp_data:
            return PassportStamp(
                text=best_result['text'],
                confidence=best_result['confidence'] / 100,
                country=stamp_data.get('country'),
                city=stamp_data.get('city'),
                entry_date=stamp_data.get('entry_date'),
                exit_date=stamp_data.get('exit_date'),
                stamp_type=stamp_data.get('stamp_type'),
                raw_data=stamp_data
            )
        
        return None
    
    def _enhance_image_for_ocr(self, image: np.ndarray) -> np.ndarray:
        """Enhance image for better OCR results"""
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(image, (3, 3), 0)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Morphological operations to clean up
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Resize image for better OCR (tesseract works better with larger images)
        height, width = cleaned.shape
        if height < 100 or width < 200:
            scale_factor = max(100 / height, 200 / width)
            new_height = int(height * scale_factor)
            new_width = int(width * scale_factor)
            cleaned = cv2.resize(cleaned, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        return cleaned
    
    def _parse_stamp_text(self, text: str) -> Optional[Dict]:
        """Parse stamp text to extract structured data"""
        # Common patterns for passport stamps
        patterns = {
            'date': r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            'time': r'(\d{1,2}:\d{2})',
            'airport_code': r'([A-Z]{3})',
            'country': r'(UNITED STATES|CANADA|MEXICO|UNITED KINGDOM|FRANCE|GERMANY|ITALY|SPAIN|JAPAN|CHINA|AUSTRALIA)',
            'city': r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            'entry_exit': r'(ENTRY|EXIT|ARRIVAL|DEPARTURE)',
            'visa_type': r'(TOURIST|BUSINESS|STUDENT|WORK|TRANSIT)'
        }
        
        extracted_data = {}
        
        # Extract dates
        dates = re.findall(patterns['date'], text)
        if dates:
            # Try to determine entry vs exit based on context
            if 'ENTRY' in text.upper() or 'ARRIVAL' in text.upper():
                extracted_data['entry_date'] = self._parse_date(dates[0])
            elif 'EXIT' in text.upper() or 'DEPARTURE' in text.upper():
                extracted_data['exit_date'] = self._parse_date(dates[0])
            else:
                # Default to entry date if unclear
                extracted_data['entry_date'] = self._parse_date(dates[0])
        
        # Extract country
        country_match = re.search(patterns['country'], text, re.IGNORECASE)
        if country_match:
            extracted_data['country'] = country_match.group(1).title()
        
        # Extract city
        city_match = re.search(patterns['city'], text)
        if city_match:
            extracted_data['city'] = city_match.group(1).title()
        
        # Extract stamp type
        if 'ENTRY' in text.upper() or 'ARRIVAL' in text.upper():
            extracted_data['stamp_type'] = 'entry'
        elif 'EXIT' in text.upper() or 'DEPARTURE' in text.upper():
            extracted_data['stamp_type'] = 'exit'
        else:
            extracted_data['stamp_type'] = 'unknown'
        
        # Extract airport code
        airport_match = re.search(patterns['airport_code'], text)
        if airport_match:
            extracted_data['airport_code'] = airport_match.group(1)
        
        return extracted_data if extracted_data else None
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime object"""
        date_formats = [
            '%m/%d/%Y',
            '%m/%d/%y',
            '%d/%m/%Y',
            '%d/%m/%y',
            '%Y-%m-%d',
            '%d-%m-%Y'
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        return None
    
    async def validate_stamp_data(self, stamp: PassportStamp) -> bool:
        """Validate extracted stamp data"""
        # Check if we have at least a date or country
        if not stamp.entry_date and not stamp.exit_date and not stamp.country:
            return False
        
        # Check date validity
        if stamp.entry_date and stamp.entry_date > datetime.now():
            return False
        
        if stamp.exit_date and stamp.exit_date > datetime.now():
            return False
        
        # Check if entry date is before exit date
        if stamp.entry_date and stamp.exit_date and stamp.entry_date > stamp.exit_date:
            return False
        
        return True
