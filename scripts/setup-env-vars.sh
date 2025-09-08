#!/bin/bash

# Environment Variables Setup Script for TravelCheck
# This script helps configure environment variables for OAuth

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up environment variables for TravelCheck${NC}"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed. Please install it first:${NC}"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}🔐 Please login to Firebase:${NC}"
    firebase login
fi

# Get project ID
PROJECT_ID=$(firebase use --add 2>/dev/null | grep -o 'travelcheck-[a-z0-9-]*' | head -1 || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}📋 Please select your Firebase project:${NC}"
    firebase use --add
    PROJECT_ID=$(firebase use | grep -o 'travelcheck-[a-z0-9-]*' | head -1)
fi

echo -e "${BLUE}📋 Using project: ${PROJECT_ID}${NC}"

# Function to set environment variable
set_env_var() {
    local key=$1
    local value=$2
    local description=$3
    
    echo -e "${BLUE}🔧 Setting ${key}...${NC}"
    if [ -n "$value" ]; then
        firebase functions:config:set ${key}="${value}"
        echo -e "${GREEN}✅ ${key} set successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  ${key} not provided, skipping${NC}"
    fi
    echo ""
}

# Interactive setup
echo -e "${YELLOW}📝 Let's set up your OAuth environment variables${NC}"
echo -e "${YELLOW}   Press Enter to skip any variable you don't have yet${NC}"
echo ""

# Gmail OAuth Configuration
echo -e "${BLUE}📧 Gmail OAuth Configuration${NC}"
read -p "Gmail Client ID: " GMAIL_CLIENT_ID
read -p "Gmail Client Secret: " GMAIL_CLIENT_SECRET
read -p "Gmail Redirect URI (default: https://${PROJECT_ID}.web.app/auth/oauth-callback?provider=gmail): " GMAIL_REDIRECT_URI
GMAIL_REDIRECT_URI=${GMAIL_REDIRECT_URI:-"https://${PROJECT_ID}.web.app/auth/oauth-callback?provider=gmail"}

echo ""

# Microsoft 365 OAuth Configuration
echo -e "${BLUE}📧 Microsoft 365 OAuth Configuration${NC}"
read -p "Office365 Client ID: " OFFICE365_CLIENT_ID
read -p "Office365 Client Secret: " OFFICE365_CLIENT_SECRET
read -p "Office365 Redirect URI (default: https://${PROJECT_ID}.web.app/auth/oauth-callback?provider=office365): " OFFICE365_REDIRECT_URI
OFFICE365_REDIRECT_URI=${OFFICE365_REDIRECT_URI:-"https://${PROJECT_ID}.web.app/auth/oauth-callback?provider=office365"}

echo ""

# Security Configuration
echo -e "${BLUE}🔒 Security Configuration${NC}"
read -p "Encryption Key (32 characters, or press Enter to generate): " ENCRYPTION_KEY
if [ -z "$ENCRYPTION_KEY" ]; then
    ENCRYPTION_KEY=$(openssl rand -hex 16)
    echo -e "${GREEN}✅ Generated encryption key: ${ENCRYPTION_KEY}${NC}"
fi

read -p "Enforce App Check (true/false, default: false): " ENFORCE_APP_CHECK
ENFORCE_APP_CHECK=${ENFORCE_APP_CHECK:-"false"}

echo ""

# Document AI Configuration
echo -e "${BLUE}📄 Document AI Configuration${NC}"
read -p "Document AI Project ID (default: ${PROJECT_ID}): " DOC_AI_PROJECT_ID
DOC_AI_PROJECT_ID=${DOC_AI_PROJECT_ID:-"${PROJECT_ID}"}

read -p "Document AI Location (default: us): " DOC_AI_LOCATION
DOC_AI_LOCATION=${DOC_AI_LOCATION:-"us"}

read -p "Document AI Processor ID: " DOC_AI_PROCESSOR_ID

echo ""

# Set all environment variables
echo -e "${BLUE}🔧 Setting Firebase Functions environment variables...${NC}"

# Gmail OAuth
set_env_var "gmail.client_id" "$GMAIL_CLIENT_ID" "Gmail OAuth Client ID"
set_env_var "gmail.client_secret" "$GMAIL_CLIENT_SECRET" "Gmail OAuth Client Secret"
set_env_var "gmail.redirect_uri" "$GMAIL_REDIRECT_URI" "Gmail OAuth Redirect URI"

# Microsoft 365 OAuth
set_env_var "office365.client_id" "$OFFICE365_CLIENT_ID" "Office365 OAuth Client ID"
set_env_var "office365.client_secret" "$OFFICE365_CLIENT_SECRET" "Office365 OAuth Client Secret"
set_env_var "office365.redirect_uri" "$OFFICE365_REDIRECT_URI" "Office365 OAuth Redirect URI"

# Security
set_env_var "app.encryption_key" "$ENCRYPTION_KEY" "Token Encryption Key"
set_env_var "app.enforce_app_check" "$ENFORCE_APP_CHECK" "App Check Enforcement"

# Document AI
set_env_var "docai.project_id" "$DOC_AI_PROJECT_ID" "Document AI Project ID"
set_env_var "docai.location" "$DOC_AI_LOCATION" "Document AI Location"
if [ -n "$DOC_AI_PROCESSOR_ID" ]; then
    set_env_var "docai.processor_id" "$DOC_AI_PROCESSOR_ID" "Document AI Processor ID"
fi

# Create local .env file for development
echo -e "${BLUE}📄 Creating local .env file for development...${NC}"
cat > functions/.env << EOF
# Gmail OAuth Configuration
GMAIL_CLIENT_ID=${GMAIL_CLIENT_ID}
GMAIL_CLIENT_SECRET=${GMAIL_CLIENT_SECRET}
GMAIL_REDIRECT_URI=http://localhost:3000/auth/oauth-callback?provider=gmail

# Office365 OAuth Configuration
OFFICE365_CLIENT_ID=${OFFICE365_CLIENT_ID}
OFFICE365_CLIENT_SECRET=${OFFICE365_CLIENT_SECRET}
OFFICE365_REDIRECT_URI=http://localhost:3000/auth/oauth-callback?provider=office365

# Security
ENCRYPTION_KEY=${ENCRYPTION_KEY}
ENFORCE_APP_CHECK=${ENFORCE_APP_CHECK}

# Google Cloud Document AI
GOOGLE_CLOUD_DOCUMENT_AI_PROJECT_ID=${DOC_AI_PROJECT_ID}
GOOGLE_CLOUD_DOCUMENT_AI_LOCATION=${DOC_AI_LOCATION}
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=${DOC_AI_PROCESSOR_ID}
EOF

echo -e "${GREEN}✅ Environment variables configured successfully!${NC}"
echo ""
echo -e "${GREEN}📁 Files created:${NC}"
echo -e "   - functions/.env (for local development)"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "   1. Deploy Firebase Functions: firebase deploy --only functions"
echo -e "   2. Test OAuth flows in your application"
echo -e "   3. Verify email sync functionality"
echo ""
echo -e "${BLUE}🔗 Useful commands:${NC}"
echo -e "   - View config: firebase functions:config:get"
echo -e "   - Deploy functions: firebase deploy --only functions"
echo -e "   - View logs: firebase functions:log"
