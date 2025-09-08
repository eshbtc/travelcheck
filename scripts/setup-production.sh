#!/bin/bash

# TravelCheck - Production Setup Script
# This script helps automate the production environment setup

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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
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

# Get project configuration
get_project_config() {
    print_status "Getting project configuration..."
    
    # Get current project ID
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
    
    if [ -z "$PROJECT_ID" ]; then
        print_error "No Google Cloud project is set. Please run 'gcloud config set project YOUR_PROJECT_ID'"
        exit 1
    fi
    
    print_success "Using project: $PROJECT_ID"
    
    # Get region
    read -p "Enter your preferred region (default: us-central1): " REGION
    REGION=${REGION:-us-central1}
    
    # Get domain
    read -p "Enter your production domain (e.g., travelcheck.com): " DOMAIN
    
    if [ -z "$DOMAIN" ]; then
        print_error "Domain is required"
        exit 1
    fi
    
    print_success "Configuration:"
    echo "  Project ID: $PROJECT_ID"
    echo "  Region: $REGION"
    echo "  Domain: $DOMAIN"
}

# Enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    APIs=(
        "vision.googleapis.com"
        "documentai.googleapis.com"
        "gmail.googleapis.com"
        "people.googleapis.com"
        "cloudfunctions.googleapis.com"
        "firestore.googleapis.com"
        "storage.googleapis.com"
        "analytics.googleapis.com"
        "run.googleapis.com"
    )
    
    for api in "${APIs[@]}"; do
        print_status "Enabling $api..."
        gcloud services enable "$api" --project="$PROJECT_ID"
    done
    
    print_success "All APIs enabled"
}

# Create service account
create_service_account() {
    print_status "Creating service account..."
    
    SERVICE_ACCOUNT_NAME="travelcheck-functions"
    SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
    
    # Check if service account already exists
    if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
        print_warning "Service account already exists"
    else
        gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
            --description="Service account for TravelCheck Firebase Functions" \
            --display-name="TravelCheck Functions" \
            --project="$PROJECT_ID"
        print_success "Service account created"
    fi
    
    # Grant necessary roles
    ROLES=(
        "roles/vision.admin"
        "roles/documentai.admin"
        "roles/firestore.admin"
        "roles/storage.admin"
        "roles/cloudfunctions.admin"
    )
    
    for role in "${ROLES[@]}"; do
        print_status "Granting role: $role"
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
            --role="$role" \
            --quiet
    done
    
    print_success "Service account configured"
}

# Create Document AI processor
create_document_ai_processor() {
    print_status "Creating Document AI processor..."
    
    PROCESSOR_NAME="travelcheck-passport-processor"
    
    # Check if processor already exists
    if gcloud documentai processors list --location=us --project="$PROJECT_ID" | grep -q "$PROCESSOR_NAME"; then
        print_warning "Document AI processor already exists"
    else
        gcloud documentai processors create \
            --location=us \
            --display-name="$PROCESSOR_NAME" \
            --type=FORM_PARSER_PROCESSOR \
            --project="$PROJECT_ID"
        print_success "Document AI processor created"
    fi
    
    # Get processor ID
    PROCESSOR_ID=$(gcloud documentai processors list --location=us --project="$PROJECT_ID" --filter="displayName:$PROCESSOR_NAME" --format="value(name)" | cut -d'/' -f6)
    print_success "Processor ID: $PROCESSOR_ID"
}

# Set Firebase environment variables
set_firebase_config() {
    print_status "Setting Firebase environment variables..."
    
    # Check if user wants to set OAuth credentials
    read -p "Do you want to set OAuth credentials now? (y/n): " SET_OAUTH
    
    if [ "$SET_OAUTH" = "y" ]; then
        read -p "Enter Gmail Client ID: " GMAIL_CLIENT_ID
        read -p "Enter Gmail Client Secret: " GMAIL_CLIENT_SECRET
        read -p "Enter Office365 Client ID: " OFFICE365_CLIENT_ID
        read -p "Enter Office365 Client Secret: " OFFICE365_CLIENT_SECRET
        
        # Set Firebase config
        firebase functions:config:set \
            gmail.client_id="$GMAIL_CLIENT_ID" \
            gmail.client_secret="$GMAIL_CLIENT_SECRET" \
            gmail.redirect_uri="https://$DOMAIN/auth/oauth-callback?provider=gmail" \
            office365.client_id="$OFFICE365_CLIENT_ID" \
            office365.client_secret="$OFFICE365_CLIENT_SECRET" \
            office365.redirect_uri="https://$DOMAIN/auth/oauth-callback?provider=office365" \
            google.cloud_project_id="$PROJECT_ID" \
            google.document_ai_project_id="$PROJECT_ID" \
            google.document_ai_location="us" \
            google.document_ai_processor_id="$PROCESSOR_ID"
        
        print_success "Firebase environment variables set"
    else
        print_warning "Skipping OAuth credentials setup. You can set them later with:"
        echo "  firebase functions:config:set gmail.client_id=\"YOUR_CLIENT_ID\""
        echo "  firebase functions:config:set gmail.client_secret=\"YOUR_CLIENT_SECRET\""
        echo "  firebase functions:config:set office365.client_id=\"YOUR_CLIENT_ID\""
        echo "  firebase functions:config:set office365.client_secret=\"YOUR_CLIENT_SECRET\""
    fi
}

# Deploy security rules
deploy_security_rules() {
    print_status "Deploying security rules..."
    
    firebase deploy --only firestore:rules,storage
    print_success "Security rules deployed"
}

# Build and deploy
deploy_application() {
    print_status "Building and deploying application..."
    
    # Build frontend
    print_status "Building frontend..."
    cd frontend
    npm ci
    npm run build
    cd ..
    
    # Deploy everything
    print_status "Deploying to Firebase..."
    firebase deploy
    
    print_success "Application deployed successfully!"
}

# Main execution
main() {
    echo "🚀 TravelCheck Production Setup Script"
    echo "======================================"
    echo
    
    check_dependencies
    get_project_config
    
    echo
    read -p "Do you want to continue with the setup? (y/n): " CONTINUE
    
    if [ "$CONTINUE" != "y" ]; then
        print_warning "Setup cancelled"
        exit 0
    fi
    
    enable_apis
    create_service_account
    create_document_ai_processor
    set_firebase_config
    deploy_security_rules
    deploy_application
    
    echo
    print_success "🎉 Production setup completed!"
    echo
    echo "Next steps:"
    echo "1. Configure OAuth applications (Gmail and Office365)"
    echo "2. Set up custom domain in Firebase Hosting"
    echo "3. Test the application functionality"
    echo "4. Set up monitoring and analytics"
    echo
    echo "Your application should be available at: https://$DOMAIN"
}

# Run main function
main "$@"
