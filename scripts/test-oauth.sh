#!/bin/bash

# OAuth Test Script for TravelCheck
# This script tests OAuth configurations and endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing OAuth configurations for TravelCheck${NC}"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed${NC}"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Firebase${NC}"
    exit 1
fi

# Get current project
PROJECT_ID=$(firebase use | grep -o 'travelcheck-[a-z0-9-]*' | head -1)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No Firebase project selected${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Testing project: ${PROJECT_ID}${NC}"

# Function to test environment variable
test_env_var() {
    local key=$1
    local description=$2
    
    echo -e "${BLUE}🔍 Testing ${key}...${NC}"
    local value=$(firebase functions:config:get ${key} 2>/dev/null | jq -r '.')
    
    if [ "$value" != "null" ] && [ -n "$value" ]; then
        echo -e "${GREEN}✅ ${key}: ${value:0:20}...${NC}"
    else
        echo -e "${RED}❌ ${key}: Not set${NC}"
    fi
}

# Test Gmail OAuth configuration
echo -e "${BLUE}📧 Testing Gmail OAuth Configuration${NC}"
test_env_var "gmail.client_id" "Gmail Client ID"
test_env_var "gmail.client_secret" "Gmail Client Secret"
test_env_var "gmail.redirect_uri" "Gmail Redirect URI"

echo ""

# Test Microsoft 365 OAuth configuration
echo -e "${BLUE}📧 Testing Microsoft 365 OAuth Configuration${NC}"
test_env_var "office365.client_id" "Office365 Client ID"
test_env_var "office365.client_secret" "Office365 Client Secret"
test_env_var "office365.redirect_uri" "Office365 Redirect URI"

echo ""

# Test security configuration
echo -e "${BLUE}🔒 Testing Security Configuration${NC}"
test_env_var "app.encryption_key" "Encryption Key"
test_env_var "app.enforce_app_check" "App Check Enforcement"

echo ""

# Test Document AI configuration
echo -e "${BLUE}📄 Testing Document AI Configuration${NC}"
test_env_var "docai.project_id" "Document AI Project ID"
test_env_var "docai.location" "Document AI Location"
test_env_var "docai.processor_id" "Document AI Processor ID"

echo ""

# Test OAuth URLs
echo -e "${BLUE}🔗 Testing OAuth URLs${NC}"

# Gmail OAuth URL
GMAIL_CLIENT_ID=$(firebase functions:config:get gmail.client_id 2>/dev/null | jq -r '.')
GMAIL_REDIRECT_URI=$(firebase functions:config:get gmail.redirect_uri 2>/dev/null | jq -r '.')

if [ "$GMAIL_CLIENT_ID" != "null" ] && [ -n "$GMAIL_CLIENT_ID" ]; then
    GMAIL_OAUTH_URL="https://accounts.google.com/o/oauth2/auth?client_id=${GMAIL_CLIENT_ID}&redirect_uri=${GMAIL_REDIRECT_URI}&scope=https://www.googleapis.com/auth/gmail.readonly&response_type=code&access_type=offline"
    echo -e "${GREEN}✅ Gmail OAuth URL: ${GMAIL_OAUTH_URL}${NC}"
else
    echo -e "${RED}❌ Gmail OAuth URL: Cannot generate (missing client_id)${NC}"
fi

# Microsoft 365 OAuth URL
OFFICE365_CLIENT_ID=$(firebase functions:config:get office365.client_id 2>/dev/null | jq -r '.')
OFFICE365_REDIRECT_URI=$(firebase functions:config:get office365.redirect_uri 2>/dev/null | jq -r '.')

if [ "$OFFICE365_CLIENT_ID" != "null" ] && [ -n "$OFFICE365_CLIENT_ID" ]; then
    OFFICE365_OAUTH_URL="https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${OFFICE365_CLIENT_ID}&response_type=code&redirect_uri=${OFFICE365_REDIRECT_URI}&scope=offline_access%20Mail.Read&response_mode=query"
    echo -e "${GREEN}✅ Office365 OAuth URL: ${OFFICE365_OAUTH_URL}${NC}"
else
    echo -e "${RED}❌ Office365 OAuth URL: Cannot generate (missing client_id)${NC}"
fi

echo ""

# Test Firebase Functions deployment
echo -e "${BLUE}🚀 Testing Firebase Functions deployment${NC}"
if firebase functions:list &> /dev/null; then
    echo -e "${GREEN}✅ Firebase Functions are deployed${NC}"
    
    # List available functions
    echo -e "${BLUE}📋 Available functions:${NC}"
    firebase functions:list | grep -E "(getGmailAuthUrl|getOffice365AuthUrl|handleGmailCallback|handleOffice365Callback)" || echo -e "${YELLOW}⚠️  OAuth functions not found${NC}"
else
    echo -e "${RED}❌ Firebase Functions are not deployed${NC}"
    echo -e "${YELLOW}   Run: firebase deploy --only functions${NC}"
fi

echo ""

# Test local development setup
echo -e "${BLUE}🏠 Testing local development setup${NC}"
if [ -f "functions/.env" ]; then
    echo -e "${GREEN}✅ Local .env file exists${NC}"
    
    # Check if required variables are in .env
    if grep -q "GMAIL_CLIENT_ID" functions/.env && grep -q "OFFICE365_CLIENT_ID" functions/.env; then
        echo -e "${GREEN}✅ OAuth credentials found in .env${NC}"
    else
        echo -e "${YELLOW}⚠️  OAuth credentials missing in .env${NC}"
    fi
else
    echo -e "${RED}❌ Local .env file not found${NC}"
    echo -e "${YELLOW}   Run: ./scripts/setup-env-vars.sh${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}📊 OAuth Configuration Summary${NC}"
echo -e "${YELLOW}📋 To complete OAuth setup:${NC}"
echo -e "   1. Run: ./scripts/setup-gcp-oauth.sh"
echo -e "   2. Run: ./scripts/setup-azure-oauth.sh"
echo -e "   3. Run: ./scripts/setup-env-vars.sh"
echo -e "   4. Deploy: firebase deploy --only functions"
echo -e "   5. Test OAuth flows in your application"
echo ""
echo -e "${BLUE}🔗 Test URLs:${NC}"
echo -e "   - Gmail OAuth: /email/gmail"
echo -e "   - Office365 OAuth: /email/office365"
echo -e "   - OAuth Callback: /auth/oauth-callback"
