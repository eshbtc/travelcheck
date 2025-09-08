"""
Email service for Gmail and Office365 integration
"""

import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import msal
import httpx
from bs4 import BeautifulSoup
import json

from app.config import settings
from app.models.email_models import EmailMessage, FlightConfirmation


class EmailService:
    """Service for email integration and parsing"""
    
    def __init__(self):
        self.gmail_scopes = [
            'https://www.googleapis.com/auth/gmail.readonly'
        ]
        self.office365_scopes = [
            'https://graph.microsoft.com/Mail.Read'
        ]
    
    async def authenticate_gmail(self, user_id: str) -> str:
        """Authenticate with Gmail and return authorization URL"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GMAIL_CLIENT_ID,
                    "client_secret": settings.GMAIL_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GMAIL_REDIRECT_URI]
                }
            },
            scopes=self.gmail_scopes
        )
        flow.redirect_uri = settings.GMAIL_REDIRECT_URI
        
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        
        return auth_url
    
    async def handle_gmail_callback(self, code: str) -> Dict[str, Any]:
        """Handle Gmail OAuth callback"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GMAIL_CLIENT_ID,
                    "client_secret": settings.GMAIL_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GMAIL_REDIRECT_URI]
                }
            },
            scopes=self.gmail_scopes
        )
        flow.redirect_uri = settings.GMAIL_REDIRECT_URI
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Get user info
        service = build('gmail', 'v1', credentials=credentials)
        profile = service.users().getProfile(userId='me').execute()
        
        return {
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'expires_at': credentials.expiry,
            'email': profile['emailAddress']
        }
    
    async def authenticate_office365(self, user_id: str) -> str:
        """Authenticate with Office365 and return authorization URL"""
        app = msal.PublicClientApplication(
            settings.OFFICE365_CLIENT_ID,
            authority="https://login.microsoftonline.com/common"
        )
        
        auth_url = app.get_authorization_request_url(
            self.office365_scopes,
            redirect_uri=settings.OFFICE365_REDIRECT_URI
        )
        
        return auth_url
    
    async def handle_office365_callback(self, code: str) -> Dict[str, Any]:
        """Handle Office365 OAuth callback"""
        app = msal.PublicClientApplication(
            settings.OFFICE365_CLIENT_ID,
            authority="https://login.microsoftonline.com/common"
        )
        
        result = app.acquire_token_by_authorization_code(
            code,
            scopes=self.office365_scopes,
            redirect_uri=settings.OFFICE365_REDIRECT_URI
        )
        
        if "error" in result:
            raise Exception(f"Office365 authentication failed: {result['error']}")
        
        # Get user info
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {result['access_token']}"}
            response = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers=headers
            )
            user_info = response.json()
        
        return {
            'access_token': result['access_token'],
            'refresh_token': result.get('refresh_token'),
            'expires_at': datetime.now() + timedelta(seconds=result['expires_in']),
            'email': user_info['mail'] or user_info['userPrincipalName']
        }
    
    async def fetch_gmail_messages(self, access_token: str, max_results: int = 100) -> List[EmailMessage]:
        """Fetch messages from Gmail"""
        credentials = Credentials(token=access_token)
        service = build('gmail', 'v1', credentials=credentials)
        
        # Search for flight-related emails
        query = "subject:(flight OR booking OR confirmation OR itinerary OR ticket) " \
                "OR from:(airline OR travel OR booking)"
        
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=max_results
        ).execute()
        
        messages = []
        for msg in results.get('messages', []):
            message = service.users().messages().get(
                userId='me',
                id=msg['id']
            ).execute()
            
            # Extract headers
            headers = {h['name']: h['value'] for h in message['payload']['headers']}
            
            # Extract body
            body = self._extract_email_body(message['payload'])
            
            email_msg = EmailMessage(
                message_id=msg['id'],
                subject=headers.get('Subject', ''),
                sender=headers.get('From', ''),
                received_at=datetime.fromtimestamp(int(message['internalDate']) / 1000),
                body=body
            )
            
            messages.append(email_msg)
        
        return messages
    
    async def fetch_office365_messages(self, access_token: str, max_results: int = 100) -> List[EmailMessage]:
        """Fetch messages from Office365"""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Search for flight-related emails
            search_query = "subject:(flight OR booking OR confirmation OR itinerary OR ticket)"
            
            response = await client.get(
                f"https://graph.microsoft.com/v1.0/me/messages",
                headers=headers,
                params={
                    "$search": search_query,
                    "$top": max_results,
                    "$select": "id,subject,from,receivedDateTime,body"
                }
            )
            
            data = response.json()
            messages = []
            
            for msg in data.get('value', []):
                email_msg = EmailMessage(
                    message_id=msg['id'],
                    subject=msg.get('subject', ''),
                    sender=msg['from']['emailAddress']['address'] if msg.get('from') else '',
                    received_at=datetime.fromisoformat(msg['receivedDateTime'].replace('Z', '+00:00')),
                    body=msg.get('body', {}).get('content', '')
                )
                
                messages.append(email_msg)
        
        return messages
    
    def _extract_email_body(self, payload: Dict) -> str:
        """Extract email body from Gmail payload"""
        body = ""
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body']['data']
                    body += data
                elif part['mimeType'] == 'text/html':
                    data = part['body']['data']
                    # Convert HTML to text
                    soup = BeautifulSoup(data, 'html.parser')
                    body += soup.get_text()
        else:
            if payload['mimeType'] == 'text/plain':
                body = payload['body']['data']
            elif payload['mimeType'] == 'text/html':
                data = payload['body']['data']
                soup = BeautifulSoup(data, 'html.parser')
                body = soup.get_text()
        
        return body
    
    def parse_flight_confirmation(self, email: EmailMessage) -> Optional[FlightConfirmation]:
        """Parse flight confirmation from email"""
        # Common flight confirmation patterns
        patterns = {
            'flight_number': r'([A-Z]{2,3}\s?\d{3,4})',
            'departure_date': r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            'departure_time': r'(\d{1,2}:\d{2}\s?(?:AM|PM)?)',
            'airport_code': r'([A-Z]{3})',
            'airline': r'(American|Delta|United|Southwest|JetBlue|Alaska|Spirit|Frontier)'
        }
        
        # Extract information using regex
        extracted_data = {}
        for key, pattern in patterns.items():
            matches = re.findall(pattern, email.body, re.IGNORECASE)
            if matches:
                extracted_data[key] = matches[0] if len(matches) == 1 else matches
        
        # Try to identify if this is a flight confirmation
        confirmation_keywords = [
            'flight confirmation', 'booking confirmation', 'itinerary',
            'flight details', 'ticket confirmation', 'boarding pass'
        ]
        
        is_confirmation = any(
            keyword in email.subject.lower() or keyword in email.body.lower()
            for keyword in confirmation_keywords
        )
        
        if is_confirmation and extracted_data:
            return FlightConfirmation(
                email_id=email.message_id,
                flight_number=extracted_data.get('flight_number'),
                departure_date=extracted_data.get('departure_date'),
                departure_time=extracted_data.get('departure_time'),
                airport_code=extracted_data.get('airport_code'),
                airline=extracted_data.get('airline'),
                raw_data=extracted_data
            )
        
        return None
