#!/bin/bash

# TravelCheck - Production Environment Validation Script
# This script validates that the production environment is properly configured

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

# Validation results
VALIDATION_RESULTS=()

# Function to add validation result
add_result() {
    local status=$1
    local message=$2
    
    if [ "$status" = "success" ]; then
        print_success "$message"
        VALIDATION_RESULTS+=("✅ $message")
    elif [ "$status" = "warning" ]; then
        print_warning "$message"
        VALIDATION_RESULTS+=("⚠️  $message")
    else
        print_error "$message"
        VALIDATION_RESULTS+=("❌ $message")
    fi
}

# Check Firebase CLI authentication
check_firebase_auth() {
    print_status "Checking Firebase authentication..."
    
    if firebase projects:list &> /dev/null; then
        add_result "success" "Firebase CLI authentication verified"
    else
        add_result "error" "Firebase CLI not authenticated. Run 'firebase login'"
    fi
}

# Check Firebase project configuration
check_firebase_project() {
    print_status "Checking Firebase project configuration..."
    
    if [ -f "firebase.json" ]; then
        add_result "success" "firebase.json configuration file found"
    else
        add_result "error" "firebase.json not found"
    fi
    
    if [ -f ".firebaserc" ]; then
        add_result "success" ".firebaserc project configuration found"
    else
        add_result "error" ".firebaserc not found"
    fi
}

# Check Firebase Functions configuration
check_firebase_functions() {
    print_status "Checking Firebase Functions configuration..."
    
    if [ -f "functions/package.json" ]; then
        add_result "success" "Firebase Functions package.json found"
    else
        add_result "error" "Firebase Functions package.json not found"
    fi
    
    if [ -f "functions/index.js" ]; then
        add_result "success" "Firebase Functions index.js found"
    else
        add_result "error" "Firebase Functions index.js not found"
    fi
    
    # Check if functions can be deployed
    cd functions
    if npm list &> /dev/null; then
        add_result "success" "Firebase Functions dependencies installed"
    else
        add_result "warning" "Firebase Functions dependencies not installed. Run 'npm install'"
    fi
    cd ..
}

# Check frontend configuration
check_frontend() {
    print_status "Checking frontend configuration..."
    
    if [ -f "frontend/package.json" ]; then
        add_result "success" "Frontend package.json found"
    else
        add_result "error" "Frontend package.json not found"
    fi
    
    if [ -f "frontend/next.config.js" ]; then
        add_result "success" "Next.js configuration found"
    else
        add_result "error" "Next.js configuration not found"
    fi
    
    # Check if frontend can be built
    cd frontend
    if npm list &> /dev/null; then
        add_result "success" "Frontend dependencies installed"
    else
        add_result "warning" "Frontend dependencies not installed. Run 'npm install'"
    fi
    cd ..
}

# Check security rules
check_security_rules() {
    print_status "Checking security rules..."
    
    if [ -f "firestore.rules" ]; then
        add_result "success" "Firestore security rules found"
    else
        add_result "error" "Firestore security rules not found"
    fi
    
    if [ -f "storage.rules" ]; then
        add_result "success" "Storage security rules found"
    else
        add_result "error" "Storage security rules not found"
    fi
}

# Check environment configuration
check_environment_config() {
    print_status "Checking environment configuration..."
    
    if [ -f "env.example" ]; then
        add_result "success" "Environment example file found"
    else
        add_result "warning" "Environment example file not found"
    fi
    
    if [ -f "functions/env.example" ]; then
        add_result "success" "Functions environment example file found"
    else
        add_result "warning" "Functions environment example file not found"
    fi
}

# Check deployment scripts
check_deployment_scripts() {
    print_status "Checking deployment scripts..."
    
    if [ -f "scripts/setup-production.sh" ]; then
        add_result "success" "Production setup script found"
    else
        add_result "warning" "Production setup script not found"
    fi
    
    if [ -f "scripts/deploy-production.sh" ]; then
        add_result "success" "Production deployment script found"
    else
        add_result "warning" "Production deployment script not found"
    fi
    
    if [ -f "scripts/validate-production.sh" ]; then
        add_result "success" "Production validation script found"
    else
        add_result "warning" "Production validation script not found"
    fi
}

# Check GitHub Actions
check_github_actions() {
    print_status "Checking GitHub Actions configuration..."
    
    if [ -d ".github/workflows" ]; then
        add_result "success" "GitHub Actions workflows directory found"
        
        if [ -f ".github/workflows/deploy.yml" ]; then
            add_result "success" "Deployment workflow found"
        else
            add_result "warning" "Deployment workflow not found"
        fi
    else
        add_result "warning" "GitHub Actions workflows directory not found"
    fi
}

# Check Firebase Functions environment variables
check_firebase_config() {
    print_status "Checking Firebase Functions configuration..."
    
    # Try to get Firebase config
    if firebase functions:config:get &> /dev/null; then
        add_result "success" "Firebase Functions configuration accessible"
        
        # Check for specific config values
        CONFIG=$(firebase functions:config:get 2>/dev/null || echo "{}")
        
        if echo "$CONFIG" | grep -q "gmail"; then
            add_result "success" "Gmail OAuth configuration found"
        else
            add_result "warning" "Gmail OAuth configuration not found"
        fi
        
        if echo "$CONFIG" | grep -q "office365"; then
            add_result "success" "Office365 OAuth configuration found"
        else
            add_result "warning" "Office365 OAuth configuration not found"
        fi
    else
        add_result "warning" "Firebase Functions configuration not accessible"
    fi
}

# Test Firebase Functions deployment
test_functions_deployment() {
    print_status "Testing Firebase Functions deployment..."
    
    # Check if functions can be deployed (dry run)
    if firebase deploy --only functions --dry-run &> /dev/null; then
        add_result "success" "Firebase Functions deployment test passed"
    else
        add_result "warning" "Firebase Functions deployment test failed"
    fi
}

# Test frontend build
test_frontend_build() {
    print_status "Testing frontend build..."
    
    cd frontend
    if npm run build &> /dev/null; then
        add_result "success" "Frontend build test passed"
    else
        add_result "warning" "Frontend build test failed"
    fi
    cd ..
}

# Generate validation report
generate_report() {
    echo
    echo "📊 Production Environment Validation Report"
    echo "=========================================="
    echo
    
    local success_count=0
    local warning_count=0
    local error_count=0
    
    for result in "${VALIDATION_RESULTS[@]}"; do
        echo "$result"
        
        if [[ $result == ✅* ]]; then
            ((success_count++))
        elif [[ $result == ⚠️* ]]; then
            ((warning_count++))
        elif [[ $result == ❌* ]]; then
            ((error_count++))
        fi
    done
    
    echo
    echo "Summary:"
    echo "  ✅ Success: $success_count"
    echo "  ⚠️  Warnings: $warning_count"
    echo "  ❌ Errors: $error_count"
    echo
    
    if [ $error_count -eq 0 ]; then
        if [ $warning_count -eq 0 ]; then
            print_success "🎉 All validations passed! Your environment is ready for production."
        else
            print_warning "⚠️  Environment is mostly ready, but please address the warnings above."
        fi
    else
        print_error "❌ Please fix the errors above before deploying to production."
    fi
}

# Main execution
main() {
    echo "🔍 TravelCheck Production Environment Validation"
    echo "==============================================="
    echo
    
    check_firebase_auth
    check_firebase_project
    check_firebase_functions
    check_frontend
    check_security_rules
    check_environment_config
    check_deployment_scripts
    check_github_actions
    check_firebase_config
    test_functions_deployment
    test_frontend_build
    
    generate_report
}

# Run main function
main "$@"
