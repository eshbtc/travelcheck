#!/bin/bash

# TravelCheck - Production Deployment Script
# This script automates the production deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "firebase.json" ]; then
        print_error "firebase.json not found. Please run this script from the project root directory."
        exit 1
    fi
    print_success "Running from correct directory"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install it first."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Check if user is logged in to Firebase
check_firebase_auth() {
    print_status "Checking Firebase authentication..."
    
    if ! firebase projects:list &> /dev/null; then
        print_error "Not logged in to Firebase. Please run 'firebase login' first."
        exit 1
    fi
    
    print_success "Firebase authentication verified"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Test frontend build
    print_status "Testing frontend build..."
    cd frontend
    npm ci
    npm run build
    cd ..
    
    # Test Firebase Functions
    print_status "Testing Firebase Functions..."
    cd functions
    npm ci
    npm run lint
    cd ..
    
    print_success "All tests passed"
}

# Deploy Firebase Functions
deploy_functions() {
    print_status "Deploying Firebase Functions..."
    
    cd functions
    npm ci
    cd ..
    
    firebase deploy --only functions
    
    print_success "Firebase Functions deployed"
}

# Deploy Firestore rules
deploy_firestore_rules() {
    print_status "Deploying Firestore security rules..."
    
    firebase deploy --only firestore:rules
    
    print_success "Firestore rules deployed"
}

# Deploy Storage rules
deploy_storage_rules() {
    print_status "Deploying Storage security rules..."
    
    firebase deploy --only storage
    
    print_success "Storage rules deployed"
}

# Deploy frontend
deploy_frontend() {
    print_status "Deploying frontend..."
    
    cd frontend
    npm ci
    npm run build
    cd ..
    
    firebase deploy --only hosting
    
    print_success "Frontend deployed"
}

# Deploy everything
deploy_all() {
    print_status "Deploying all services..."
    
    cd frontend
    npm ci
    npm run build
    cd ..
    
    cd functions
    npm ci
    cd ..
    
    firebase deploy
    
    print_success "All services deployed"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Get the hosting URL
    HOSTING_URL=$(firebase hosting:channel:open production 2>/dev/null | grep -o 'https://[^[:space:]]*' | head -1)
    
    if [ -n "$HOSTING_URL" ]; then
        print_success "Deployment verified"
        echo "Your application is available at: $HOSTING_URL"
    else
        print_warning "Could not verify deployment URL"
    fi
}

# Main execution
main() {
    echo "🚀 TravelCheck Production Deployment Script"
    echo "==========================================="
    echo
    
    check_directory
    check_dependencies
    check_firebase_auth
    
    echo
    echo "Deployment options:"
    echo "1. Deploy all services (recommended)"
    echo "2. Deploy only Firebase Functions"
    echo "3. Deploy only frontend"
    echo "4. Deploy only security rules"
    echo "5. Run tests only"
    echo
    
    read -p "Select deployment option (1-5): " OPTION
    
    case $OPTION in
        1)
            run_tests
            deploy_all
            verify_deployment
            ;;
        2)
            deploy_functions
            ;;
        3)
            deploy_frontend
            ;;
        4)
            deploy_firestore_rules
            deploy_storage_rules
            ;;
        5)
            run_tests
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac
    
    echo
    print_success "🎉 Deployment completed!"
    echo
    echo "Next steps:"
    echo "1. Test your application functionality"
    echo "2. Monitor Firebase Console for any issues"
    echo "3. Set up monitoring and analytics"
    echo "4. Configure custom domain if needed"
}

# Run main function
main "$@"
