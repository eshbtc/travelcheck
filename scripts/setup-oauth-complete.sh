#!/bin/bash

# Complete OAuth Setup Script for TravelCheck
# This script orchestrates the entire OAuth setup process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Complete OAuth Setup for TravelCheck${NC}"
echo -e "${YELLOW}This script will guide you through setting up Gmail and Microsoft 365 OAuth${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo -e "${YELLOW}   Install: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Check if az CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed${NC}"
    echo -e "${YELLOW}   Install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli${NC}"
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed${NC}"
    echo -e "${YELLOW}   Install: npm install -g firebase-tools${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites are installed${NC}"
echo ""

# Get configuration
echo -e "${BLUE}📋 Configuration${NC}"
read -p "Firebase Project ID (default: travelcheck-app): " PROJECT_ID
PROJECT_ID=${PROJECT_ID:-"travelcheck-app"}

read -p "Domain for OAuth redirects (default: ${PROJECT_ID}.web.app): " DOMAIN
DOMAIN=${DOMAIN:-"${PROJECT_ID}.web.app"}

read -p "Protocol (default: https): " PROTOCOL
PROTOCOL=${PROTOCOL:-"https"}

echo -e "${GREEN}✅ Configuration:${NC}"
echo -e "   Project ID: ${PROJECT_ID}"
echo -e "   Domain: ${DOMAIN}"
echo -e "   Protocol: ${PROTOCOL}"
echo ""

# Step 1: Google Cloud OAuth Setup
echo -e "${BLUE}📧 Step 1: Setting up Google Cloud OAuth${NC}"
read -p "Do you want to set up Gmail OAuth? (y/n): " SETUP_GMAIL

if [[ $SETUP_GMAIL =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🔧 Running Gmail OAuth setup...${NC}"
    ./scripts/setup-gcp-oauth.sh "${PROJECT_ID}" "${DOMAIN}" "${PROTOCOL}"
    
    echo -e "${YELLOW}📋 Manual steps required for Gmail OAuth:${NC}"
    echo -e "   1. Go to Google Cloud Console"
    echo -e "   2. Create OAuth 2.0 Client ID"
    echo -e "   3. Add redirect URI: ${PROTOCOL}://${DOMAIN}/auth/oauth-callback?provider=gmail"
    echo -e "   4. Copy Client ID and Secret"
    echo ""
    read -p "Press Enter when you have completed the Gmail OAuth setup..."
fi

# Step 2: Microsoft Azure OAuth Setup
echo -e "${BLUE}📧 Step 2: Setting up Microsoft Azure OAuth${NC}"
read -p "Do you want to set up Microsoft 365 OAuth? (y/n): " SETUP_OFFICE365

if [[ $SETUP_OFFICE365 =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🔧 Running Microsoft 365 OAuth setup...${NC}"
    ./scripts/setup-azure-oauth.sh "${DOMAIN}" "${PROTOCOL}"
    
    echo -e "${GREEN}✅ Microsoft 365 OAuth setup completed automatically!${NC}"
    echo -e "${YELLOW}📋 Check the output above for your OAuth credentials${NC}"
    echo ""
fi

# Step 3: Environment Variables Setup
echo -e "${BLUE}🔧 Step 3: Setting up environment variables${NC}"
read -p "Do you want to configure environment variables? (y/n): " SETUP_ENV

if [[ $SETUP_ENV =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🔧 Running environment variables setup...${NC}"
    ./scripts/setup-env-vars.sh
    echo -e "${GREEN}✅ Environment variables configured!${NC}"
fi

# Step 4: Deploy Firebase Functions
echo -e "${BLUE}🚀 Step 4: Deploying Firebase Functions${NC}"
read -p "Do you want to deploy Firebase Functions now? (y/n): " DEPLOY_FUNCTIONS

if [[ $DEPLOY_FUNCTIONS =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🔧 Deploying Firebase Functions...${NC}"
    firebase deploy --only functions
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Firebase Functions deployed successfully!${NC}"
    else
        echo -e "${RED}❌ Firebase Functions deployment failed${NC}"
        echo -e "${YELLOW}   Check the error messages above${NC}"
    fi
fi

# Step 5: Test OAuth Configuration
echo -e "${BLUE}🧪 Step 5: Testing OAuth configuration${NC}"
read -p "Do you want to test the OAuth configuration? (y/n): " TEST_OAUTH

if [[ $TEST_OAUTH =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🔧 Running OAuth tests...${NC}"
    ./scripts/test-oauth.sh
fi

# Final summary
echo ""
echo -e "${GREEN}🎉 OAuth setup process completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "   1. Test OAuth flows in your application:"
echo -e "      - Gmail: https://${DOMAIN}/email/gmail"
echo -e "      - Office365: https://${DOMAIN}/email/office365"
echo -e "   2. Verify email sync functionality"
echo -e "   3. Test passport upload and OCR processing"
echo -e "   4. Generate travel history reports"
echo ""
echo -e "${BLUE}🔗 Useful commands:${NC}"
echo -e "   - View config: firebase functions:config:get"
echo -e "   - View logs: firebase functions:log"
echo -e "   - Test OAuth: ./scripts/test-oauth.sh"
echo ""
echo -e "${GREEN}✅ Your TravelCheck application is ready for OAuth email integration!${NC}"
