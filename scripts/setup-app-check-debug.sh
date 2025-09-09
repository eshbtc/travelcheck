#!/usr/bin/env bash
set -euo pipefail

# TravelCheck - App Check Debug Token Setup
# This script helps configure the App Check debug token for development

DEBUG_TOKEN="8917507E-AC21-4A4B-B09A-054E88E423EA"
PROJECT_ID="travelcheck-app"

echo "🔧 Setting up App Check debug token for TravelCheck..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "   firebase login"
    exit 1
fi

echo "✅ Firebase CLI is installed and you're logged in"
echo ""

# Set the debug token for the project
echo "🔑 Setting App Check debug token..."
firebase appcheck:debug-tokens:create "$DEBUG_TOKEN" --project="$PROJECT_ID"

echo ""
echo "✅ App Check debug token has been configured!"
echo ""
echo "📋 Next steps:"
echo "   1. The debug token is already configured in your frontend code"
echo "   2. Make sure your .env.local file has NODE_ENV=development"
echo "   3. Restart your development server if it's running"
echo ""
echo "🔍 To verify the setup:"
echo "   - Open your browser's developer console"
echo "   - Look for App Check debug messages"
echo "   - The token should be automatically used in development mode"
echo ""
echo "⚠️  Important:"
echo "   - This debug token is only for development"
echo "   - Never use it in production"
echo "   - Keep it secure and don't commit it to version control"

