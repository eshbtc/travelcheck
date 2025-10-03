# Travel Check - Travel History Tracker

A comprehensive travel history tracking application that automatically extracts travel data from flight confirmation emails, passport scans, and calendar events to generate accurate travel reports for tax and immigration purposes.

---

## Tech Stack

### Core Framework
- **Next.js 14** - React framework with App Router
- **TypeScript 5** - Type-safe development
- **React 18** - UI library

### Infrastructure (Railway Stack)
- **Railway Postgres** - Managed PostgreSQL database
- **Prisma 6** - Type-safe ORM and schema management
- **NextAuth.js 4** - Authentication with OAuth support
- **Cloudflare R2** - S3-compatible object storage

### Authentication
- **Google OAuth** - Sign in with Google
- **Azure AD OAuth** - Sign in with Microsoft/Office 365
- **Session Management** - JWT-based sessions with 30-day expiry

### AI & Document Processing
- **Google Document AI** - Passport OCR extraction
- **Vertex AI (Gemini 1.5 Pro)** - Email parsing and travel data extraction

### UI & Styling
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Component library
- **Lucide Icons** - Icon system

### Data Fetching & State
- **React Query (TanStack Query)** - Server state management
- **SWR** - Data fetching with cache

### Testing
- **Jest 30** - Unit and integration testing
- **Testing Library** - React component testing
- **TypeScript Test Utilities** - Type-safe test helpers

---

## Features

### ✈️ Travel Tracking
- Automatic extraction from Gmail/Office365 flight confirmations
- Passport scan OCR with duplicate detection
- Manual travel entry with calendar view
- Trip grouping and leg tracking
- Daily presence summaries

### 📊 Report Generation
- Generate travel reports for specific date ranges
- Export to PDF/Excel
- Custom report templates
- Tax and immigration report formats

### 🔐 Security & Privacy
- OAuth 2.0 authentication (Google + Azure AD)
- Encrypted OAuth token storage (AES-256-GCM)
- Application-level authorization
- Secure file storage with signed URLs
- Rate limiting on expensive endpoints

### 🧠 AI-Powered Features
- Intelligent email parsing (flight dates, airlines, routes)
- Passport data extraction (MRZ, names, dates, countries)
- Duplicate detection across passport scans
- Smart suggestions for missing data

---

## Getting Started

### Prerequisites

- Node.js 20+ (22.15.0 recommended)
- npm 10+
- Railway CLI (optional)
- Cloudflare account (for R2 storage)

### Quick Start

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd travel-check/frontend
   npm install
   ```

2. **Set Up Environment**:
   ```bash
   cp .env.example .env.local
   # Fill in required variables (see RAILWAY_SETUP.md)
   ```

3. **Set Up Database**:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Open Browser**: [http://localhost:3000](http://localhost:3000)

### Detailed Setup

See [RAILWAY_SETUP.md](../RAILWAY_SETUP.md) for comprehensive setup instructions including:
- Railway Postgres configuration
- Cloudflare R2 storage setup
- OAuth provider configuration
- Environment variable guide

---

## Project Structure

```
frontend/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Auth pages (login, signup)
│   ├── (shell)/                   # Authenticated app shell
│   │   ├── dashboard/             # Main dashboard
│   │   ├── travel/                # Travel tracking
│   │   │   ├── (tabs)/
│   │   │   │   ├── evidence/      # Email + passport scans
│   │   │   │   ├── timeline/      # Chronological view
│   │   │   │   ├── calendar/      # Calendar view
│   │   │   │   └── map/           # Map visualization
│   │   ├── reports/               # Report generation
│   │   └── settings/              # User settings
│   ├── api/                       # API routes
│   │   ├── auth/                  # NextAuth handlers
│   │   ├── ai/                    # AI endpoints
│   │   ├── user/                  # User management
│   │   ├── travel/                # Travel CRUD
│   │   ├── email/                 # Email integration
│   │   ├── reports/               # Report generation
│   │   └── billing/               # Billing & credits
│   ├── global-error.tsx           # Global error boundary
│   └── layout.tsx                 # Root layout
├── lib/                           # Core libraries
│   ├── auth.ts                    # Auth helpers
│   ├── auth.config.ts             # NextAuth configuration
│   ├── prisma.ts                  # Prisma client singleton
│   ├── storage/                   # Storage services
│   │   ├── r2.ts                  # R2 storage implementation
│   │   ├── types.ts               # Storage type definitions
│   │   └── index.ts               # Barrel exports
│   └── env.ts                     # Environment validation
├── prisma/
│   ├── schema.prisma              # Database schema (22 models)
│   └── migrations/                # Database migrations
├── src/
│   ├── components/                # React components
│   │   ├── passport/              # Passport scan components
│   │   ├── travel/                # Travel entry components
│   │   ├── reports/               # Report components
│   │   └── ui/                    # shadcn/ui components
│   ├── hooks/                     # Custom React hooks
│   ├── services/                  # Business logic services
│   ├── utils/                     # Utility functions
│   └── types/                     # TypeScript type definitions
├── tests/                         # Test files
├── docs/                          # Documentation
│   └── ERROR_BOUNDARIES.md        # Error handling docs
├── .env.example                   # Environment template
├── .env.local                     # Local environment (gitignored)
├── jest.config.js                 # Jest configuration
├── jest.setup.js                  # Jest setup file
├── next.config.js                 # Next.js configuration
├── tailwind.config.ts             # Tailwind configuration
└── tsconfig.json                  # TypeScript configuration
```

---

## Development Workflow

### Running Locally

```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage

# Linting and formatting
npm run lint               # ESLint
npm run format             # Prettier

# Database
npx prisma studio          # Browse database in GUI
npx prisma migrate dev     # Create and apply migrations
npx prisma generate        # Regenerate Prisma Client
```

### Environment Variables

See `.env.example` for all required variables. Key variables:

```bash
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<32+ character secret>

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AZURE_AD_CLIENT_ID=...

# R2 Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...

# Google Cloud (Document AI)
GOOGLE_CLOUD_PROJECT_ID=...
DOCUMENT_AI_PROCESSOR_ID=...
```

---

## Database Schema

22 Prisma models tracking:

**Core**:
- User, UserPreference, EmailAccount

**Travel Data**:
- TravelHistory, TravelEntry, PassportScan, FlightEmail

**Reports**:
- Report, ReportTemplate

**Duplicate Detection**:
- DuplicateGroup, DuplicateItem, DuplicateDetectionResult

**Operations**:
- BatchOperation, BatchJob, SystemLog, HealthCheck

**AI**:
- AiCache, AiUsageLog

**Billing**:
- BillingCustomer, BillingSubscription, BillingEntitlement, BillingWebhookEvent

See `prisma/schema.prisma` for full schema.

---

## API Routes

### Authentication
- `POST /api/auth/signin` - OAuth login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Get current session

### User Management
- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/profile` - Update profile
- `GET /api/user/preferences` - Get preferences

### Travel
- `GET /api/travel/entries` - List travel entries
- `POST /api/travel/entries` - Create entry
- `PATCH /api/travel/entries/:id` - Update entry
- `DELETE /api/travel/entries/:id` - Delete entry

### Email Integration
- `POST /api/email/connect` - Connect email account (OAuth)
- `POST /api/email/sync` - Sync emails
- `GET /api/email/accounts` - List connected accounts

### Passport Scans
- `POST /api/passport/upload` - Upload scan
- `POST /api/ai/analyze-passport` - OCR extraction
- `GET /api/passport/scans` - List scans

### Reports
- `POST /api/reports/generate` - Generate report
- `GET /api/reports/:id` - Get report
- `GET /api/reports` - List reports

---

## Testing

### Test Coverage

Current: **87.5%** (14/16 tests passing)

**Coverage by Type**:
- Unit tests: Service layer, utilities
- Integration tests: API routes
- Component tests: React components
- E2E tests: (planned)

### Writing Tests

```typescript
// Example API route test
import { GET } from '@/app/api/user/profile/route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma')

describe('GET /api/user/profile', () => {
  it('returns user profile for authenticated user', async () => {
    const mockUser = { id: '123', email: 'test@example.com' }
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const request = new Request('http://localhost:3000/api/user/profile')
    const response = await GET(request)
    const data = await response.json()

    expect(data.user).toEqual(mockUser)
  })
})
```

### Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- tests/api/user/profile.test.ts

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## Deployment

### Deploy to Railway

1. **Create Railway Project**:
   ```bash
   railway init
   ```

2. **Add Postgres**:
   ```bash
   railway add postgres
   ```

3. **Set Environment Variables**:
   ```bash
   railway variables set NEXTAUTH_URL=https://your-app.railway.app
   railway variables set NEXTAUTH_SECRET=<secret>
   # ... (set all variables from .env.local)
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

5. **Run Migrations**:
   ```bash
   railway run npx prisma migrate deploy
   ```

See [RAILWAY_SETUP.md](../RAILWAY_SETUP.md) for detailed deployment instructions.

---

## Architecture Decisions

### Why Railway?
- Predictable pricing vs. Supabase usage-based
- Full control over infrastructure
- Better TypeScript integration with Prisma

### Why NextAuth?
- Industry standard for Next.js authentication
- Flexible provider configuration
- Built-in security best practices
- Excellent TypeScript support

### Why Prisma?
- End-to-end type safety
- Excellent developer experience
- Migration management
- Query optimization

### Why R2?
- S3-compatible (easy migration)
- Lower egress costs than S3
- No transfer fees within Cloudflare

---

## Performance Optimizations

### Applied Optimizations
- ✅ Next.js Image optimization (60-80% payload reduction)
- ✅ Parallel signed URL fetching (70% faster carousel load)
- ✅ Route segment caching (60% API response improvement)
- ✅ Database indexes (30-90% query speedup)
- ✅ Code splitting and tree shaking
- ✅ Bundle size reduction (-25%)

### Metrics
- **LCP**: < 3 seconds (67% improvement)
- **Image Payloads**: 8-15MB (down from 40-50MB)
- **API Response (cached)**: 0.6s (down from 1.5s)
- **Bundle Size**: 900KB (down from 1.2MB)

See [PERFORMANCE_OPTIMIZATIONS_APPLIED.md](../PERFORMANCE_OPTIMIZATIONS_APPLIED.md) for details.

---

## Security

### Authentication
- OAuth 2.0 (Google + Azure AD)
- JWT sessions with 30-day expiry
- Encrypted token storage (AES-256-GCM)
- CSRF protection (NextAuth built-in)

### Authorization
- Application-level auth checks (replaced RLS)
- Middleware-based route protection
- Admin role checking
- API endpoint rate limiting

### Data Protection
- Environment variable validation
- Secure file uploads (signed URLs)
- SQL injection prevention (Prisma parameterization)
- XSS prevention (React escaping)

### Audit Trail
- System logs for all critical operations
- User activity tracking
- Error monitoring (Sentry integration)

---

## Error Handling

Global error boundaries at:
- Root level (`/app/global-error.tsx`)
- Route level (`/app/(shell)/*/error.tsx`)

All errors integrate with:
- `ErrorHandler` utility for consistent logging
- Sentry for production error tracking
- User-friendly fallback UIs

See [docs/ERROR_BOUNDARIES.md](./docs/ERROR_BOUNDARIES.md) for details.

---

## Contributing

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- ≤ 300 LOC per PR

### Branch Naming
- `feat/<scope>` - New features
- `fix/<scope>` - Bug fixes
- `chore/<scope>` - Maintenance

### Commit Messages
```
feat: add passport duplicate detection
fix: resolve session timeout issue
chore: upgrade dependencies
docs: update API documentation
```

---

## Troubleshooting

### Common Issues

**"DATABASE_URL is not defined"**
- Ensure `.env.local` exists with `DATABASE_URL`
- Run `npx prisma validate` to check

**"Prisma Client not found"**
- Run `npx prisma generate`

**OAuth redirect_uri_mismatch**
- Check redirect URIs in Google/Azure console match exactly

**R2 bucket not found**
- Verify `R2_BUCKET_NAME` and `R2_ACCOUNT_ID` are correct

See [RAILWAY_SETUP.md](../RAILWAY_SETUP.md#troubleshooting) for more.

---

## Documentation

- [Migration Guide](../RAILWAY_MIGRATION_GUIDE.md) - Supabase to Railway migration
- [Setup Guide](../RAILWAY_SETUP.md) - Developer environment setup
- [Error Boundaries](./docs/ERROR_BOUNDARIES.md) - Error handling documentation
- [Prisma Migration](./prisma/MIGRATION.md) - Database schema details
- [Fixes Applied](../FIXES_APPLIED_20251002.md) - Security and performance fixes

---

## License

[Your License Here]

---

## Support

For issues or questions:
- Review documentation above
- Check existing GitHub issues
- Create new issue with detailed description

---

**Last Updated**: 2025-10-02
**Status**: Active Development - Railway Migration In Progress (Phases 1-3 Complete)
