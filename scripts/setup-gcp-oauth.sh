#!/bin/bash

# Google Cloud OAuth Setup Script for TravelCheck
# This script automates the setup of Gmail OAuth credentials

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${1:-"travelcheck-app"}
APP_NAME="TravelCheck"
DOMAIN=${2:-"localhost:3000"}
PROTOCOL=${3:-"http"}

echo -e "${BLUE}🚀 Setting up Google Cloud OAuth for TravelCheck${NC}"
echo -e "${YELLOW}Project ID: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}Domain: ${DOMAIN}${NC}"
echo -e "${YELLOW}Protocol: ${PROTOCOL}${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first:${NC}"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}🔐 Please authenticate with Google Cloud:${NC}"
    gcloud auth login
fi

# Set the project
echo -e "${BLUE}📋 Setting project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required APIs...${NC}"
gcloud services enable gmail.googleapis.com
gcloud services enable plus.googleapis.com
gcloud services enable people.googleapis.com

# Create OAuth consent screen
echo -e "${BLUE}📝 Setting up OAuth consent screen...${NC}"
cat > oauth_consent_config.json << EOF
{
  "displayName": "${APP_NAME}",
  "userType": "EXTERNAL",
  "developerContactInformation": "support@${DOMAIN}",
  "supportEmail": "support@${DOMAIN}",
  "description": "Travel history tracker for USCIS citizenship applications",
  "privacyPolicyUrl": "https://${DOMAIN}/privacy",
  "termsOfServiceUrl": "https://${DOMAIN}/terms"
}
EOF

# Note: OAuth consent screen creation requires manual approval in some cases
echo -e "${YELLOW}⚠️  OAuth consent screen configuration saved to oauth_consent_config.json${NC}"
echo -e "${YELLOW}   You may need to manually configure this in the Google Cloud Console${NC}"
echo -e "${YELLOW}   Go to: APIs & Services > OAuth consent screen${NC}"

# Create OAuth client
echo -e "${BLUE}🔑 Creating OAuth 2.0 client...${NC}"
REDIRECT_URI="${PROTOCOL}://${DOMAIN}/auth/oauth-callback?provider=gmail"

# Create OAuth client configuration
cat > oauth_client_config.json << EOF
{
  "web": {
    "client_id": "",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "",
    "redirect_uris": ["${REDIRECT_URI}"]
  }
}
EOF

# Create the OAuth client
CLIENT_OUTPUT=$(gcloud auth application-default print-access-token)
echo -e "${BLUE}📱 Creating OAuth client...${NC}"

# Note: gcloud doesn't have a direct command to create OAuth clients
# This requires using the REST API or manual creation
echo -e "${YELLOW}⚠️  OAuth client creation requires manual setup:${NC}"
echo -e "${YELLOW}   1. Go to: https://console.cloud.google.com/apis/credentials${NC}"
echo -e "${YELLOW}   2. Click 'Create Credentials' > 'OAuth 2.0 Client IDs'${NC}"
echo -e "${YELLOW}   3. Choose 'Web application'${NC}"
echo -e "${YELLOW}   4. Add redirect URI: ${REDIRECT_URI}${NC}"
echo -e "${YELLOW}   5. Copy the Client ID and Client Secret${NC}"

# Create environment template
echo -e "${BLUE}📄 Creating environment template...${NC}"
cat > gmail_oauth_env_template.txt << EOF
# Gmail OAuth Configuration
# Copy these values to your functions/.env file

GMAIL_CLIENT_ID=your_gmail_client_id_here
GMAIL_CLIENT_SECRET=your_gmail_client_secret_here
GMAIL_REDIRECT_URI=${REDIRECT_URI}

# Required scopes for Gmail OAuth:
# - https://www.googleapis.com/auth/gmail.readonly
# - https://www.googleapis.com/auth/userinfo.email
# - https://www.googleapis.com/auth/userinfo.profile

# Instructions:
# 1. Go to Google Cloud Console > APIs & Services > Credentials
# 2. Create OAuth 2.0 Client ID
# 3. Add redirect URI: ${REDIRECT_URI}
# 4. Copy Client ID and Secret to the variables above
# 5. Save as functions/.env
EOF

echo -e "${GREEN}✅ Gmail OAuth setup template created!${NC}"
echo -e "${GREEN}📁 Files created:${NC}"
echo -e "   - oauth_consent_config.json"
echo -e "   - oauth_client_config.json"
echo -e "   - gmail_oauth_env_template.txt"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "   1. Manually create OAuth client in Google Cloud Console"
echo -e "   2. Copy credentials to functions/.env file"
echo -e "   3. Configure OAuth consent screen"
echo -e "   4. Test the OAuth flow"
echo ""
echo -e "${BLUE}🔗 Useful links:${NC}"
echo -e "   - OAuth Consent Screen: https://console.cloud.google.com/apis/credentials/consent"
echo -e "   - OAuth Clients: https://console.cloud.google.com/apis/credentials"
echo -e "   - Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com"
