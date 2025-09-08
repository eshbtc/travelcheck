#!/bin/bash

# Firebase Functions Deployment Script
echo "🚀 Deploying TravelCheck Firebase Functions..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "firebase login"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run linting
echo "🔍 Running ESLint..."
npm run lint

# Deploy functions
echo "🚀 Deploying functions to Firebase..."
firebase deploy --only functions

echo "✅ Deployment complete!"
echo ""
echo "📋 Available functions:"
echo "  - extractPassportData: OCR processing for passport images"
echo "  - parseGmailEmails: Gmail integration for flight confirmations"
echo "  - analyzeTravelHistory: Cross-reference travel data"
echo "  - generateUSCISReport: Generate formatted reports"
echo "  - dailyEmailSync: Scheduled email synchronization"
echo ""
echo "🔗 View functions in Firebase Console:"
echo "https://console.firebase.google.com/project/travelcheck-app/functions"
