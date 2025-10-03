# Railway Migration Guide

## Executive Summary

This document tracks the migration of the Travel Check application from Supabase to Railway infrastructure. This is a **Day 0 migration** with no production users or data, allowing for a clean rebuild approach rather than complex data migration.

**Migration Status**: In Progress (Phases 1-2 Complete)

**Timeline**: 2-3 days (20-30 hours estimated)

---

## Why We're Migrating

### From: Supabase Stack
- **Database**: Supabase Postgres (managed)
- **Authentication**: Supabase Auth (built-in)
- **Storage**: Supabase Storage (built-in)
- **Features**: Row Level Security (RLS), realtime subscriptions

### To: Railway Stack
- **Database**: Railway Postgres (managed PostgreSQL)
- **Authentication**: NextAuth.js v4 (industry standard)
- **Storage**: Cloudflare R2 (S3-compatible)
- **ORM**: Prisma (type-safe database queries)

### Reasons for Migration
1. **Cost Optimization**: Railway's predictable pricing vs Supabase's usage-based model
2. **Flexibility**: Full control over authentication flows with NextAuth
3. **Type Safety**: Prisma provides end-to-end type safety
4. **Scalability**: Better prepared for future infrastructure needs
5. **Developer Experience**: Modern tooling with better TypeScript support

---

## Architecture Changes

### Before (Supabase)
```
┌─────────────────────────────────────────┐
│           Next.js Application           │
├─────────────────────────────────────────┤
│  @supabase/supabase-js Client          │
├─────────────────────────────────────────┤
│         Supabase Services               │
│  ┌──────────┬──────────┬──────────┐   │
│  │ Postgres │   Auth   │ Storage  │   │
│  │   +RLS   │  +OAuth  │          │   │
│  └──────────┴──────────┴──────────┘   │
└─────────────────────────────────────────┘
```

### After (Railway)
```
┌─────────────────────────────────────────┐
│           Next.js Application           │
├─────────────────────────────────────────┤
│  Prisma Client  │  NextAuth  │  AWS SDK │
├─────────────────────────────────────────┤
│         Railway + R2 Services           │
│  ┌──────────┬──────────┬──────────┐   │
│  │ Railway  │ NextAuth │    R2    │   │
│  │ Postgres │  +OAuth  │ Storage  │   │
│  └──────────┴──────────┴──────────┘   │
└─────────────────────────────────────────┘
```

---

## Migration Phases

### ✅ Phase 1: Infrastructure Setup (COMPLETED)
**Duration**: 4-6 hours

**Tasks Completed**:
- [x] Installed NextAuth.js v4 + Prisma adapter
- [x] Installed Prisma ORM + client
- [x] Installed AWS SDK for S3 (R2 compatibility)
- [x] Removed Supabase dependencies
- [x] Initialized Prisma with PostgreSQL provider
- [x] Created NextAuth configuration files
- [x] Created auth helper utilities
- [x] Created NextAuth API route handler
- [x] Updated environment configuration
- [x] Updated environment validation

**Files Created**:
- `frontend/lib/auth.config.ts` - NextAuth configuration
- `frontend/lib/auth.ts` - Auth helper utilities
- `frontend/app/api/auth/[...nextauth]/route.ts` - NextAuth handler
- `frontend/prisma/schema.prisma` - Initial Prisma schema
- Updated `frontend/.env.example`
- Updated `frontend/src/lib/env.ts`

**Dependencies**:
```json
{
  "next-auth": "^4.24.11",
  "@auth/prisma-adapter": "^2.10.0",
  "prisma": "^6.16.3",
  "@prisma/client": "^6.16.3",
  "@aws-sdk/client-s3": "^3.901.0",
  "@aws-sdk/s3-request-presigner": "^3.901.0"
}
```

---

### ✅ Phase 2: Service Layer Creation (COMPLETED)
**Duration**: 2-4 hours

**Tasks Completed**:
- [x] Created complete Prisma schema (22 models)
- [x] Generated Prisma client
- [x] Created Prisma singleton wrapper
- [x] Created R2 storage service
- [x] Created storage type definitions
- [x] Documented schema migration strategy

**Files Created**:
- `frontend/lib/prisma.ts` - Prisma client singleton
- `frontend/lib/storage/r2.ts` - R2 storage service
- `frontend/lib/storage/types.ts` - Storage type definitions
- `frontend/lib/storage/index.ts` - Barrel exports
- `frontend/prisma/MIGRATION.md` - Prisma migration docs

**Prisma Models**: 22 total
- User, UserPreference, EmailAccount, FlightEmail
- TravelHistory, PassportScan, TravelEntry
- Report, ReportTemplate
- DuplicateGroup, DuplicateItem, DuplicateDetectionResult
- BatchOperation, BatchJob
- SystemLog, HealthCheck
- AiCache, AiUsageLog
- BillingCustomer, BillingSubscription, BillingEntitlement, BillingWebhookEvent

---

### 🔄 Phase 3: Documentation (IN PROGRESS)
**Duration**: 1-2 hours

**Tasks**:
- [ ] Create comprehensive migration guide (this document)
- [ ] Create developer setup guide
- [ ] Update main README
- [ ] Document environment variables
- [ ] Create deployment checklist

---

### ⏳ Phase 4: Remove Supabase Client Files (PENDING)
**Duration**: 1-2 hours

**Files to Delete**:
- `frontend/src/lib/supabase.ts` - Supabase browser client
- `frontend/src/lib/supabase-server.ts` - Supabase server client
- `frontend/src/contexts/AuthContext.tsx` - Supabase auth context
- `frontend/src/services/supabaseService.ts` - Supabase service layer
- `frontend/src/services/supabaseStorage.ts` - Supabase storage service
- `frontend/src/services/realtimeService.ts` - Supabase realtime (if exists)

**Verification**:
- Search codebase for remaining `@supabase` imports
- Ensure no dead code references remain

---

### ⏳ Phase 5: Update API Routes (PENDING)
**Duration**: 8-10 hours

**Scope**: 58 API routes to migrate

**Pattern**:
```typescript
// Before (Supabase)
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return NextResponse.json({ user: data })
}

// After (Prisma + NextAuth)
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await requireAuth(request)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })

  return NextResponse.json({ user })
}
```

**Routes by Category**:
- Auth routes (5 files) - Replace with NextAuth
- User routes (8 files) - Convert to Prisma
- Travel routes (12 files) - Convert to Prisma
- Email routes (7 files) - Convert to Prisma
- Report routes (6 files) - Convert to Prisma
- Integration routes (4 files) - Convert to Prisma
- Billing routes (3 files) - Convert to Prisma
- Admin routes (5 files) - Convert to Prisma + add role checks
- CRON routes (4 files) - Convert to Prisma
- System routes (4 files) - Convert to Prisma

---

### ⏳ Phase 6: Update UI Components (PENDING)
**Duration**: 4-6 hours

**Scope**: 21 components using Supabase auth

**Pattern**:
```typescript
// Before (Supabase)
import { useSupabaseUser } from '@/contexts/AuthContext'

export function UserProfile() {
  const user = useSupabaseUser()
  if (!user) return <LoginButton />
  return <div>{user.email}</div>
}

// After (NextAuth)
import { useSession } from 'next-auth/react'

export function UserProfile() {
  const { data: session } = useSession()
  if (!session) return <LoginButton />
  return <div>{session.user.email}</div>
}
```

**Components to Update**:
- Auth components (5 files)
- Dashboard components (8 files)
- Travel components (4 files)
- Settings components (4 files)

---

### ⏳ Phase 7: Storage Migration (PENDING)
**Duration**: 2-3 hours

**Scope**: Replace Supabase Storage with R2

**Pattern**:
```typescript
// Before (Supabase Storage)
import { supabaseStorage } from '@/services/supabaseStorage'

const { data, error } = await supabaseStorage.upload(
  'passports/scan.jpg',
  fileBuffer
)

// After (R2 Storage)
import { r2Storage } from '@/lib/storage'

const url = await r2Storage.uploadFile(
  'passports/scan.jpg',
  fileBuffer,
  'image/jpeg'
)
```

**Files to Update**:
- Passport scan upload (3 files)
- Report generation (2 files)
- Profile image upload (1 file)

---

### ⏳ Phase 8: Testing & Quality Gates (PENDING)
**Duration**: 4-6 hours

**Test Coverage Required**:
- [ ] OAuth flow (Google + Azure AD)
- [ ] Session management (login/logout)
- [ ] API route authorization
- [ ] Database CRUD operations (all 22 models)
- [ ] File upload/download (R2)
- [ ] Error handling and boundaries
- [ ] Performance benchmarks

**Quality Gates**:
- [ ] All tests passing (expand from 14/16 to 50+ tests)
- [ ] TypeScript strict mode (no errors)
- [ ] ESLint passing
- [ ] Build successful
- [ ] No console errors in dev mode

---

### ⏳ Phase 9: Deployment (PENDING)
**Duration**: 2-3 hours

**Deployment Checklist**:
- [ ] Set up Railway Postgres database
- [ ] Run Prisma migrations on Railway
- [ ] Set up Cloudflare R2 bucket
- [ ] Configure all environment variables in Railway
- [ ] Deploy application to Railway
- [ ] Test OAuth flows in production
- [ ] Test file uploads in production
- [ ] Monitor error logs (Sentry)
- [ ] Verify performance metrics

---

## Environment Variables

### Before (Supabase)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OAuth (Supabase format)
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
OFFICE365_CLIENT_ID=xxx
OFFICE365_CLIENT_SECRET=xxx
```

### After (Railway)
```bash
# Database
DATABASE_URL=postgresql://user:password@railway.app:5432/dbname

# NextAuth
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
ENCRYPTION_KEY=32-char-minimum-encryption-key

# OAuth (NextAuth format)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
AZURE_AD_CLIENT_ID=xxx
AZURE_AD_CLIENT_SECRET=xxx
AZURE_AD_TENANT_ID=xxx

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=r2-access-key
R2_SECRET_ACCESS_KEY=r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://pub-xxx.r2.dev (optional)

# Existing (unchanged)
GOOGLE_CLOUD_PROJECT_ID=xxx
GOOGLE_APPLICATION_CREDENTIALS=./key.json
DOCUMENT_AI_PROCESSOR_ID=xxx
VERTEX_AI_LOCATION=us-central1
```

---

## Rollback Procedure

Since this is a Day 0 migration with no production data:

### Simple Rollback (Code Only)
1. **Revert Git commits**:
   ```bash
   git reset --hard <commit-before-migration>
   git push origin main --force
   ```

2. **Restore Supabase dependencies**:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr @supabase/storage-js
   npm uninstall next-auth @auth/prisma-adapter prisma @prisma/client
   ```

3. **Restore environment variables**:
   - Switch `.env.local` back to Supabase credentials

4. **Redeploy**:
   - Railway will automatically redeploy with reverted code

**Recovery Time**: ~10 minutes (code-only rollback)

### No Database Rollback Needed
- Railway Postgres database can be deleted (no production data)
- Supabase project can be preserved if needed

---

## Risk Assessment

### ✅ Low Risk (Day 0 Application)
- No production users to impact
- No data migration complexity
- No downtime concerns
- Full rollback possible with git revert

### ⚠️ Medium Risk (Testing Required)
- OAuth provider configuration changes (test both Google + Azure)
- Storage migration (verify file uploads work with R2)
- Application-level authorization (replaced RLS with middleware)

### 🚫 Mitigated Risks
- **Data loss**: N/A (no production data)
- **Downtime**: N/A (no production users)
- **Breaking changes**: Caught by TypeScript + tests
- **Security regressions**: NextAuth is battle-tested, comprehensive auth tests added

---

## Success Criteria

### Technical
- [ ] All 58 API routes migrated to Prisma
- [ ] All 21 components migrated to NextAuth
- [ ] All tests passing (50+ tests, >80% coverage)
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No ESLint errors

### Functional
- [ ] Google OAuth login works
- [ ] Azure AD OAuth login works
- [ ] Session persistence works
- [ ] File uploads work (R2)
- [ ] All CRUD operations work (22 models)
- [ ] Admin role checks work

### Performance
- [ ] API response times ≤ Supabase baseline
- [ ] LCP < 3 seconds
- [ ] No console errors in production

---

## Next Steps

1. **Complete Phase 3**: Finish documentation
2. **Start Phase 4**: Remove Supabase client files
3. **Execute Phase 5**: Update API routes (use implementation-engineer agent)
4. **Execute Phase 6**: Update UI components (use implementation-engineer agent)
5. **Execute Phase 7**: Migrate storage operations
6. **Execute Phase 8**: Comprehensive testing (use test-author-coverage-enforcer agent)
7. **Execute Phase 9**: Deploy to Railway

---

## Related Documentation

- [Railway Setup Guide](./RAILWAY_SETUP.md) - Developer onboarding
- [Prisma Migration Details](./frontend/prisma/MIGRATION.md) - Schema migration docs
- [Previous Fixes](./FIXES_APPLIED_20251002.md) - Audit fixes applied before migration
- [Error Boundaries](./frontend/docs/ERROR_BOUNDARIES.md) - Error handling setup

---

**Last Updated**: 2025-10-02
**Status**: Phases 1-2 Complete, Phase 3 In Progress
**Next Milestone**: Remove Supabase client files (Phase 4)
