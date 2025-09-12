# Clean Room Test Checklist - Pre-Production Deployment

This checklist ensures all major wiring fixes work correctly in a fresh environment before first production deploy.

## Pre-Test Setup

### ✅ Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Set all required environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key  
  - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
  - `ADMIN_EMAILS` - Admin email addresses (comma-separated)
  - `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` - Gmail OAuth credentials
  - `OFFICE365_CLIENT_ID` / `OFFICE365_CLIENT_SECRET` - Office365 OAuth credentials  
  - `GOOGLE_AI_API_KEY` - Google AI API key for pattern analysis
  - `GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID` - Document AI processor ID

### ✅ Database Reset
- [ ] Run `supabase db reset` or apply baseline schema
- [ ] Verify all migrations applied successfully:
  - `20250912000000_baseline.sql` - Complete schema with tables, RLS, storage
  - `20250912000003_create_admin_scheduled_tables.sql` - Admin/scheduled route tables
  - `20250912000004_add_missing_columns_tables.sql` - Duplicate detection & batch processing

### ✅ Storage Setup Verification  
- [ ] Confirm `passport-scans` bucket exists
- [ ] Confirm `processed-documents` bucket exists
- [ ] Verify RLS policies applied to storage buckets

## Core Integration Flow Tests

### 🔗 OAuth Integration Testing

#### Gmail Integration
- [ ] **Connect**: Navigate to Integrations page → Connect Gmail
  - Should redirect to Google OAuth consent screen
  - After authorization, should redirect back with success message
  - Check: `email_accounts` table has Gmail entry with `is_active = true`

- [ ] **Status Check**: Dashboard should show Gmail as connected
  - StatusTiles should display "Connected Integrations: 1/2" (if only Gmail connected)
  - Integration status API should return Gmail as connected

- [ ] **Sync**: Trigger Gmail sync (manual or via admin route)
  - Check: `flight_emails` table populates with email data
  - Check: No 500 errors in server logs
  - Check: Dashboard shows email processing statistics

#### Office365 Integration
- [ ] **Connect**: Navigate to Integrations page → Connect Office365
  - Should redirect to Microsoft OAuth consent screen
  - After authorization, should redirect back with success message  
  - Check: `email_accounts` table has Office365 entry

- [ ] **Sync**: Trigger Office365 sync
  - Check: `flight_emails` table populates with additional email data
  - Check: Dashboard reflects combined statistics

### 📊 Data Flow Testing

#### Travel Report Generation
- [ ] **Generate Report**: Use report generation interface
  - Should call `/api/reports/generate` successfully
  - Check: `reports` table contains generated report
  - Check: Report has proper structure with `summary`, `detailedEntries`

- [ ] **Travel Pages Display Real Data**: 
  - **Evidence Page**: Should show travel records or "no data" message (not loading forever)
  - **Timeline Page**: Should render travel timeline or empty state
  - **Map Page**: Should display travel locations or empty map
  - **Calendar Page**: Should show presence days or empty calendar

#### Dashboard Metrics
- [ ] **StatusTiles Accuracy**: Dashboard tiles should show:
  - Correct count of connected integrations
  - Travel days count (from universal reports)
  - Countries visited count  
  - Booking processing statistics
  - Last sync timestamps

### 📄 Document Processing Testing

#### Passport Upload & OCR
- [ ] **Upload Test Images**: Upload 2-3 test passport images
  - Should upload to `passport-scans` bucket successfully
  - Check: `passport_scans` table populates with scan records
  - Check: OCR processing completes without errors

- [ ] **Document AI Processing**: 
  - Should call `/api/ai/analyze-passport` successfully
  - Check: `passport_scans.passport_info` contains extracted data
  - Check: Processing status changes to 'completed'

#### Batch Processing
- [ ] **Batch Upload**: Upload multiple passport images via batch interface
  - Check: `batch_operations` table tracks processing
  - Check: All images processed and saved to database
  - Check: Duplicate detection runs (if duplicates exist)

#### Duplicate Detection
- [ ] **Upload Duplicate**: Upload the same passport image twice  
  - Check: `passport_scans.is_duplicate` set to true for duplicate
  - Check: `duplicate_detection_results` table records detection
  - Check: `/api/scans/detect-duplicates` returns proper results

### 🔧 Admin & Scheduled Operations

#### Admin Route Access
- [ ] **Admin Authentication**: Test admin routes with admin email
  - `/api/booking/ingest-daily` should return 200 (not 403)
  - `/api/booking/ingest-evening` should return 200 (not 403)
  - `/api/admin/system` should return system status

#### Scheduled Ingestion
- [ ] **Daily Ingestion**: Call `/api/booking/ingest-daily`
  - Check: `batch_jobs` table records ingestion job
  - Check: `system_logs` table logs the operation
  - Check: No database schema errors

- [ ] **Evening Analysis**: Call `/api/booking/ingest-evening`
  - Check: Analysis results stored in `travel_analysis_cache`
  - Check: Batch job completes successfully

### 🧠 AI & Pattern Analysis

#### AI Services (requires GOOGLE_AI_API_KEY)
- [ ] **Pattern Analysis**: Call `/api/ai/analyze-patterns`
  - Should return travel pattern insights
  - Check: No authentication errors with Google AI

- [ ] **Smart Suggestions**: Call `/api/ai/generate-suggestions`  
  - Should return intelligent travel suggestions
  - Check: Proper API response structure

### 📈 Status & Monitoring

#### Booking Status Endpoint
- [ ] **Rich Status Data**: Call `/api/booking/status`
  - Should return detailed statistics:
    - Flight email processing stats
    - Passport scan processing stats  
    - Travel entry statistics
    - Processing queue status
  - Check: Data matches actual database records

#### Health Checks
- [ ] **Database Health**: Verify all tables accessible
- [ ] **Storage Health**: Verify file uploads work
- [ ] **API Health**: All endpoints return expected responses

## Error Scenarios

### 🚨 Error Handling Tests
- [ ] **Invalid OAuth**: Test with invalid OAuth credentials (should fail gracefully)
- [ ] **Missing API Keys**: Test AI routes without `GOOGLE_AI_API_KEY` (should return proper error)
- [ ] **Invalid File Uploads**: Upload non-image files (should reject with clear message)
- [ ] **Unauthorized Access**: Test admin routes as regular user (should return 403)

## Performance & Data Validation

### 📊 Data Consistency  
- [ ] **Report vs Database**: Compare report data with actual database records
- [ ] **Dashboard vs API**: Verify dashboard tiles match API responses
- [ ] **Cross-Service Data**: Ensure integration status consistent across all services

### ⚡ Performance Checks
- [ ] **Page Load Times**: All pages load within reasonable time (< 3s)
- [ ] **API Response Times**: Most endpoints respond within 1s
- [ ] **File Upload Performance**: Large passport images upload successfully

## Clean Room Success Criteria

### ✅ Must Pass All:
1. **OAuth flows work end-to-end** - Users can connect Gmail/Office365
2. **Email sync populates database** - Flight emails are extracted and stored  
3. **Travel pages show real data** - No more empty states when data exists
4. **Dashboard reflects reality** - Status tiles match actual database state
5. **Document processing works** - Passport OCR and analysis complete successfully
6. **Admin operations function** - Scheduled ingestion and batch processing work
7. **No schema errors** - All database operations complete without column/table errors
8. **Proper error handling** - Invalid inputs fail gracefully with clear messages

## Post-Test Actions

### 🧹 Cleanup (if needed)
- [ ] Clear test data from database
- [ ] Remove test files from storage buckets
- [ ] Reset admin logs and system state

### 📝 Document Issues
- [ ] Record any failing tests with error details
- [ ] Note performance bottlenecks or slow operations
- [ ] Update deployment notes with any discovered requirements

---

## Quick Test Commands

```bash
# Reset and apply migrations
supabase db reset

# Run development server
npm run dev

# Check migration status
supabase db show

# View logs during testing
supabase logs

# Check storage buckets
supabase storage list
```

This checklist ensures all major wiring fixes work correctly before production deployment. Any failures should be addressed before going live with real user data.