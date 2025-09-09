# Travel History Tracker for Citizenship Applications

A comprehensive system to automatically compile international travel history from passport stamps, email confirmations, and flight tracking data for USCIS citizenship applications and other immigration purposes.

## 🎯 Problem Statement

USCIS requires applicants to list all international trips lasting 24+ hours over the past 5 years. Many countries don't stamp passports at entry/exit, making it difficult to reconstruct accurate travel histories. This system solves this by:

- **OCR Processing**: Extract dates and locations from passport stamps
- **Email Integration**: Parse flight confirmation emails from Gmail/Office365
- **Flight Tracking**: Cross-reference with apps like Flighty
- **Data Validation**: Cross-check multiple sources for accuracy
- **Report Generation**: Create USCIS-compliant travel history reports

## 🏗️ System Architecture

### Core Components

1. **Data Collection Layer**
   - Gmail API integration (OAuth2)
   - Microsoft Graph API (Office365)
   - OCR via Google Cloud Vision + Document AI
   - Flight tracking API integration

2. **Processing Engine**
   - Email parser for flight confirmations
   - OCR text extraction and validation
   - Data normalization and deduplication
   - Cross-reference validation

3. **User Interface**
   - Secure authentication
   - Document upload interface
   - Travel history review/edit
   - Report generation and export

4. **Data Storage**
   - Encrypted user data storage (Firestore + Storage)
   - Audit logs for compliance
   - Backup and recovery

### Technology Stack

- Backend: Firebase Functions (Node.js callable functions)
- Frontend: React/Next.js with Tailwind CSS
- Database: Firestore with security rules; Storage for files
- OCR: Google Cloud Vision + Document AI
- APIs: Gmail API, Microsoft Graph API
- Cloud: Google Cloud Platform (Firebase)
- Security: Firebase Auth, App Check, OAuth2; tokens encrypted at rest

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI
- Gmail API credentials
- Microsoft Graph API credentials
- Document AI processor IDs

### Installation (Firebase-only)

```bash
# Clone repository
git clone <repository-url>
cd travel-check

# Install dependencies
cd functions && npm install && cd ..
cd frontend && npm install && cd ..

# Configure environment
cp env.example .env
cp functions/env.example functions/.env  # optional for local emulators

# Run frontend locally
cd frontend && npm run dev

# Optionally run Firebase emulators (Auth/Firestore/Storage)
# firebase emulators:start

# Deploy (requires Firebase project configured)
# firebase deploy --only functions,hosting,firestore:rules,storage
```

Note: The previous FastAPI backend has been removed. Legacy backend steps are no longer required.

## 📋 Features

### MVP Features
- [ ] Gmail/Office365 email integration
- [ ] Passport stamp OCR processing
- [ ] Basic travel history compilation
- [ ] User review and edit interface
- [ ] USCIS report generation

### Advanced Features
- [ ] Flight tracking app integration
- [ ] Multi-language OCR support
- [ ] Advanced data validation
- [ ] Mobile app companion
- [ ] API for third-party integrations

## 🔒 Security & Privacy

- **Data Encryption**: All data encrypted at rest and in transit
- **OAuth2 Authentication**: Secure API access
- **GDPR Compliance**: User data control and deletion
- **Audit Logging**: Complete activity tracking
- **SOC 2 Compliance**: Enterprise-grade security

## 📊 Data Sources

### Primary Sources
1. **Passport Stamps**: OCR extraction of entry/exit dates
2. **Email Confirmations**: Flight booking confirmations
3. **Flight Tracking**: Historical flight data from apps

### Validation Sources
- I-94 records (when available)
- Credit card statements
- Hotel booking confirmations
- Boarding passes

## 🎯 Target Users

- **Primary**: US citizenship applicants
- **Secondary**: Green card holders tracking travel
- **Tertiary**: International travelers maintaining records
- **Enterprise**: Immigration law firms

## 📈 Business Model

- **Freemium**: Basic features free, advanced features paid
- **Subscription**: Monthly/yearly plans for power users
- **Enterprise**: Custom solutions for law firms
- **API Access**: Third-party integrations

## 🛠️ Development Roadmap

### Phase 1: MVP (4-6 weeks)
- Core OCR functionality
- Basic email integration
- Simple web interface
- USCIS report generation

### Phase 2: Enhanced Features (6-8 weeks)
- Advanced OCR with custom models
- Flight tracking integration
- Mobile-responsive design
- Data validation improvements

### Phase 3: Scale & Polish (4-6 weeks)
- Performance optimization
- Advanced security features
- Multi-language support
- Enterprise features

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.travelcheck.com](https://docs.travelcheck.com)
- **Issues**: [GitHub Issues](https://github.com/travel-check/issues)
- **Email**: support@travelcheck.com

---

**Note**: This tool is designed to assist with travel history compilation but should not replace professional legal advice for immigration matters.
# Test commit for CI/CD pipeline
# CI/CD Pipeline Test - Mon Sep  8 21:23:22 CDT 2025
