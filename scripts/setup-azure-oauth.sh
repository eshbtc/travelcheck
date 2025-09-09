#!/bin/bash

# Microsoft Azure OAuth Setup Script for TravelCheck
# This script automates the setup of Microsoft 365 OAuth credentials

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="TravelCheck"
DOMAIN=${1:-"localhost:3000"}
PROTOCOL=${2:-"http"}
TENANT_ID=${3:-"common"}

echo -e "${BLUE}🚀 Setting up Microsoft Azure OAuth for TravelCheck${NC}"
echo -e "${YELLOW}App Name: ${APP_NAME}${NC}"
echo -e "${YELLOW}Domain: ${DOMAIN}${NC}"
echo -e "${YELLOW}Protocol: ${PROTOCOL}${NC}"
echo -e "${YELLOW}Tenant: ${TENANT_ID}${NC}"
echo ""

# Check if az CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first:${NC}"
    echo "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is authenticated
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}🔐 Please authenticate with Azure:${NC}"
    az login
fi

# Get current subscription
SUBSCRIPTION_ID=$(az account show --query id --output tsv)
echo -e "${BLUE}📋 Using subscription: ${SUBSCRIPTION_ID}${NC}"

# Create app registration
echo -e "${BLUE}📱 Creating Azure app registration...${NC}"
REDIRECT_URI="${PROTOCOL}://${DOMAIN}/auth/oauth-callback/office365"

# Create the app registration
APP_REGISTRATION=$(az ad app create \
    --display-name "${APP_NAME}" \
    --web-redirect-uris "${REDIRECT_URI}" \
    --query '{appId:appId,objectId:id}' \
    --output json)

APP_ID=$(echo $APP_REGISTRATION | jq -r '.appId')
OBJECT_ID=$(echo $APP_REGISTRATION | jq -r '.objectId')

echo -e "${GREEN}✅ App registration created successfully!${NC}"
echo -e "${GREEN}   App ID: ${APP_ID}${NC}"
echo -e "${GREEN}   Object ID: ${OBJECT_ID}${NC}"

# Create client secret
echo -e "${BLUE}🔑 Creating client secret...${NC}"
SECRET_RESPONSE=$(az ad app credential reset \
    --id ${APP_ID} \
    --query '{secret:password,expiresOn:endDateTime}' \
    --output json)

CLIENT_SECRET=$(echo $SECRET_RESPONSE | jq -r '.secret')
SECRET_EXPIRES=$(echo $SECRET_RESPONSE | jq -r '.expiresOn')

echo -e "${GREEN}✅ Client secret created!${NC}"
echo -e "${GREEN}   Secret expires: ${SECRET_EXPIRES}${NC}"

# Add API permissions
echo -e "${BLUE}🔧 Adding Microsoft Graph API permissions...${NC}"

# Mail.Read permission
az ad app permission add \
    --id ${APP_ID} \
    --api 00000003-0000-0000-c000-000000000000 \
    --api-permissions 570282fd-fa5c-430d-a7fd-fc8dc98a9dca=Scope

# Mail.ReadBasic permission
az ad app permission add \
    --id ${APP_ID} \
    --api 00000003-0000-0000-c000-000000000000 \
    --api-permissions a4b8392a-d8d1-4954-b029-8eecd302d582=Scope

# User.Read permission
az ad app permission add \
    --id ${APP_ID} \
    --api 00000003-0000-0000-c000-000000000000 \
    --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope

# offline_access permission
az ad app permission add \
    --id ${APP_ID} \
    --api 00000003-0000-0000-c000-000000000000 \
    --api-permissions 7427e0e9-2fba-42fe-b0c0-848c9e6a8182=Scope

echo -e "${GREEN}✅ API permissions added!${NC}"

# Create service principal
echo -e "${BLUE}👤 Creating service principal...${NC}"
az ad sp create --id ${APP_ID} > /dev/null
echo -e "${GREEN}✅ Service principal created!${NC}"

# Grant admin consent (if possible)
echo -e "${BLUE}🔐 Attempting to grant admin consent...${NC}"
if az ad app permission admin-consent --id ${APP_ID} 2>/dev/null; then
    echo -e "${GREEN}✅ Admin consent granted!${NC}"
else
    echo -e "${YELLOW}⚠️  Admin consent could not be granted automatically${NC}"
    echo -e "${YELLOW}   You may need to grant consent manually in Azure Portal${NC}"
fi

# Create environment template
echo -e "${BLUE}📄 Creating environment template...${NC}"
cat > office365_oauth_env_template.txt << EOF
# Microsoft 365 OAuth Configuration
# Copy these values to your functions/.env file

OFFICE365_CLIENT_ID=${APP_ID}
OFFICE365_CLIENT_SECRET=${CLIENT_SECRET}
OFFICE365_REDIRECT_URI=${REDIRECT_URI}

# Required scopes for Microsoft 365 OAuth:
# - Mail.Read
# - Mail.ReadBasic
# - offline_access
# - User.Read

# Instructions:
# 1. The OAuth client has been created automatically
# 2. Copy the values above to your functions/.env file
# 3. If admin consent was not granted, do it manually in Azure Portal
# 4. Test the OAuth flow

# Important: Client secret expires on ${SECRET_EXPIRES}
# Make sure to renew it before expiration!
EOF

echo -e "${GREEN}✅ Microsoft 365 OAuth setup completed!${NC}"
echo -e "${GREEN}📁 Files created:${NC}"
echo -e "   - office365_oauth_env_template.txt"
echo ""
echo -e "${GREEN}📋 OAuth Configuration:${NC}"
echo -e "   - App ID: ${APP_ID}"
echo -e "   - Client Secret: ${CLIENT_SECRET}"
echo -e "   - Redirect URI: ${REDIRECT_URI}"
echo -e "   - Secret Expires: ${SECRET_EXPIRES}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "   1. Copy credentials to functions/.env file"
echo -e "   2. Grant admin consent if not done automatically"
echo -e "   3. Test the OAuth flow"
echo ""
echo -e "${BLUE}🔗 Useful links:${NC}"
echo -e "   - Azure Portal: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/${APP_ID}"
echo -e "   - API Permissions: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/CallApiAndPermissions/appId/${APP_ID}"
echo -e "   - Microsoft Graph Explorer: https://developer.microsoft.com/en-us/graph/graph-explorer"
