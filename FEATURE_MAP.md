# FEATURE_MAP.md - Travel Check Project Direction

Last Updated: 2025-10-03

## Active Features (Current Direction)

### Infrastructure
- **Railway PostgreSQL** - Primary database (migrated from Supabase) ✅ DEPLOYED
- **Railway Hosting** - Application deployment platform ✅ DEPLOYED
- **Local PostgreSQL** - Development database via Prisma ✅ WORKING
- **NextAuth** - Authentication (replaced Supabase Auth) ✅ IMPLEMENTED
- **Google AI API** - AI suggestions (still using Google, not yet migrated to OpenAI)

### Core Features
- **Travel Entry Tracking** - Record and manage travel dates
- **Duplicate Detection** - Find and resolve duplicate entries
- **Smart Suggestions** - AI-powered travel insights
- **Reports Generation** - Generate travel reports (presence, summary, etc.)
- **Dashboard** - Central hub for travel data visualization
- **Calendar View** - Visual travel timeline
- **Map View** - Geographic travel visualization

## Deprecated Features (No Longer Pursued)

### Deprecated Infrastructure (as of 2025-10-03)
- **Supabase** - Previously used for database and auth
  - Reason: Moved to Railway for better control and cost
  - Migration: Database migrated to Railway PostgreSQL
  - Auth: Migrated to NextAuth with Railway DB

- **Google Cloud AI/Vertex AI** - Previously used for AI suggestions
  - Reason: Simplified to OpenAI API
  - Migration: AI endpoints updated to use OpenAI

- **Supabase Storage** - File uploads
  - Reason: Not needed for current features
  - Migration: N/A - feature not actively used

## Pivot History

### 2025-10-03: Infrastructure Migration
**From**: Supabase + Google Cloud
**To**: Railway + OpenAI
**Reason**:
- Better cost control with Railway
- Simpler deployment pipeline
- More control over database configuration
- Unified platform (database + hosting on Railway)

**Impact**:
- All `supabaseService` references need updating
- Google AI endpoints need OpenAI migration
- Auth system needs NextAuth implementation
- Database connection strings need updating

## Feature Mapping

### Files to Update (Post-Pivot)
- `frontend/src/services/supabaseService.ts` → Rename to `databaseService.ts`
- `frontend/src/lib/supabase.ts` → Update to Railway PostgreSQL client
- `frontend/app/api/ai/generate-suggestions/route.ts` → Migrate from Google AI to OpenAI
- All API routes using Supabase client → Update to use Prisma with Railway

### Files to Archive/Remove
- Any Supabase-specific configuration files
- Google Cloud service account files
- Vertex AI configuration

### New Files Needed
- Railway configuration files
- OpenAI service wrapper
- NextAuth configuration

## Recent Fixes (2025-10-03)

### API Endpoint Fixes
1. ✅ Created `/api/duplicates/list` GET endpoint - was missing entirely
2. ✅ Fixed `/api/reports/generate` - now auto-generates title when not provided
3. ✅ Fixed `supabaseService.generateSmartSuggestions()` - changed from GET to POST
4. ✅ Fixed `AlertList.tsx` - updated to use correct HTTP methods
5. ✅ Fixed `SmartSuggestionsPanel.tsx` - now passes userData to API

### Status
- **Database**: Successfully using Railway PostgreSQL via Prisma
- **Auth**: NextAuth working with Railway database
- **API Routes**: All using Prisma, no active Supabase dependencies
- **Build**: ✅ Compiles successfully
- **Deployment**: Running on Railway

## Remaining Tasks

1. ⚠️ Rename `supabaseService.ts` to `apiService.ts` or `databaseService.ts` (cosmetic)
2. ⚠️ Consider migrating from Google AI to OpenAI (if desired)
3. ⚠️ Clean up any remaining Supabase references in comments/naming

## Notes

- Keep service interfaces stable during migration for backward compatibility
- Prioritize getting core features working on Railway before cleanup
- Consider keeping some naming for now if it doesn't affect functionality