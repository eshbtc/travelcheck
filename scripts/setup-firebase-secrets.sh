#!/bin/bash

# TravelCheck - Firebase App Hosting Secrets Setup Script
# This script sets up secrets in Google Cloud Secret Manager for Firebase App Hosting

echo "🔐 Setting up Firebase App Hosting secrets for TravelCheck..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Please login to Firebase first:"
    echo "firebase login"
    exit 1
fi

echo "📝 Setting up secrets in Google Cloud Secret Manager..."

# Firebase Configuration Secrets
echo "Setting Firebase API Key..."
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY

echo "Setting Firebase Auth Domain..."
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN

echo "Setting Firebase Project ID..."
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_PROJECT_ID

echo "Setting Firebase Storage Bucket..."
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

echo "Setting Firebase Messaging Sender ID..."
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID

echo "Setting Firebase App ID..."
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID

echo "Setting Firebase Measurement ID..."
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

# Application Configuration Secrets
echo "Setting Google Cloud Project ID..."
firebase apphosting:secrets:set GOOGLE_CLOUD_PROJECT_ID

echo "Setting Admin Emails..."
firebase apphosting:secrets:set NEXT_PUBLIC_ADMIN_EMAILS

echo "Setting App URL..."
firebase apphosting:secrets:set NEXT_PUBLIC_APP_URL

echo "Setting API URL..."
firebase apphosting:secrets:set NEXT_PUBLIC_API_URL

echo "Setting App Environment..."
firebase apphosting:secrets:set NEXT_PUBLIC_APP_ENV

echo "✅ All secrets have been set up successfully!"
echo ""
echo "🚀 Next steps:"
echo "1. Deploy your app: firebase apphosting:backends:create"
echo "2. Or if you have an existing backend: firebase apphosting:backends:deploy"
echo ""
echo "📚 For more information, visit:"
echo "https://firebase.google.com/docs/app-hosting"
