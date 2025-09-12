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
   - Encrypted user data storage (Supabase Postgres + Storage)
   - Row-level security (RLS) for data isolation
   - Audit logs for compliance
   - Automated backup and recovery

5. **Security & Monitoring**
   - Rate limiting with exponential backoff
   - Content Security Policy (CSP) headers
   - AI cost controls and payload validation
   - Synthetic health checks for availability SLOs
   - Sentry integration for error monitoring

### Technology Stack

**Current Architecture (Production-Ready):**
- **Backend:** Next.js 14 App Router + Supabase
- **Frontend:** React/Next.js with Tailwind CSS and shadcn/ui
- **Database:** Supabase Postgres with Row Level Security (RLS)
- **Storage:** Supabase Storage with encryption
- **Authentication:** Supabase Auth (JWT) + OAuth2 (Gmail/Office365)
- **AI/OCR:** Google Cloud Document AI (via server-side API routes)
- **APIs:** Gmail API, Microsoft Graph API  
- **Hosting:** Vercel (recommended) or Node.js hosting
- **Monitoring:** Sentry for errors, synthetic checks for availability
- **Security:** CSP headers, rate limiting, encrypted OAuth tokens

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase project (URL + anon/service keys)
- Gmail + Microsoft OAuth credentials
- Document AI processor IDs + service account JSON

### Installation (Supabase + Next.js)

```bash
# Clone repository
git clone <repository-url>
cd travel-check

# Install frontend dependencies
cd frontend && npm install && cd ..

# Configure environment (root)
cp env.example .env
# Set at minimum: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ENCRYPTION_KEY,
# DOCUMENT_AI_* (or GOOGLE_APPLICATION_CREDENTIALS_JSON)

# Apply Supabase schema (see docs/SUPABASE_SETUP.md)
#  - comprehensive-supabase-schema.sql
#  - storage bucket policies

# Run locally
cd frontend && npm run dev
```

Note: The project has migrated from Firebase Functions/Firestore to Supabase + Next.js API routes. Firebase artifacts are deprecated and removed.

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

## 📚 Documentation

### Production Operations
- **[API Incident Runbook](frontend/docs/runbooks/api-incidents.md)** - Step-by-step incident response procedures
- **[Secrets Rotation Schedule](frontend/docs/ops/secrets-rotation.md)** - Security key rotation procedures and schedule
- **[Synthetic Health Checks](frontend/docs/monitoring/synthetic-checks.md)** - Availability monitoring and SLO tracking
- **[Privacy Policy](frontend/docs/PRIVACY.md)** - Comprehensive data protection and user rights documentation

### Development
- **[Production Setup Guide](PRODUCTION_SETUP_GUIDE.md)** - Deployment and configuration guide
- **[API Documentation](frontend/docs/api-docs.md)** - Complete API reference with examples
- **[Test Documentation](frontend/docs/testing.md)** - Testing strategies and boundary case coverage

### Archived Documentation  
- **[Deprecated Firebase Migration Docs](docs/archive/)** - Historical migration documentation

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/travel-check/issues)
- **Email**: support@travelcheck.com
- **Security**: security@traveltrack.com

---

**Note**: This tool is designed to assist with travel history compilation but should not replace professional legal advice for immigration matters.
