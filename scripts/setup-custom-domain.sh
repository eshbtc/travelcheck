#!/bin/bash

# Custom Domain Setup Script for TravelCheck
# This script helps configure travelcheck.xyz with Firebase Hosting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="travelcheck.xyz"
PROJECT_ID="travelcheck-app"

echo -e "${BLUE}🌐 Setting up custom domain: ${DOMAIN}${NC}"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed${NC}"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}🔐 Please login to Firebase:${NC}"
    firebase login
fi

# Set the project
echo -e "${BLUE}📋 Setting project to ${PROJECT_ID}...${NC}"
firebase use ${PROJECT_ID}

# Add custom domain to Firebase Hosting
echo -e "${BLUE}🌐 Adding custom domain to Firebase Hosting...${NC}"
firebase hosting:sites:create ${DOMAIN}

# Get the verification records
echo -e "${BLUE}📋 Getting domain verification records...${NC}"
firebase hosting:sites:get ${DOMAIN}

echo ""
echo -e "${GREEN}✅ Custom domain setup initiated!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "   1. Go to your domain registrar (where you bought travelcheck.xyz)"
echo -e "   2. Add the DNS records shown above"
echo -e "   3. Wait for DNS propagation (5-60 minutes)"
echo -e "   4. Run: firebase hosting:sites:get ${DOMAIN} to check status"
echo -e "   5. Once verified, run: firebase deploy --only hosting"
echo ""
echo -e "${BLUE}🔗 Useful commands:${NC}"
echo -e "   - Check domain status: firebase hosting:sites:get ${DOMAIN}"
echo -e "   - Deploy to custom domain: firebase deploy --only hosting --site ${DOMAIN}"
echo -e "   - View hosting sites: firebase hosting:sites:list"
echo ""
echo -e "${GREEN}📧 OAuth URLs for ${DOMAIN}:${NC}"
echo -e "   - Gmail: https://${DOMAIN}/email/gmail"
echo -e "   - Office365: https://${DOMAIN}/email/office365"
echo -e "   - OAuth Callback: https://${DOMAIN}/auth/oauth-callback"
