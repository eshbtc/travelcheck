# Supabase Setup Guide

This project runs on Next.js API routes + Supabase (Postgres + Storage). Follow these steps to provision your database, storage and environment.

## Prerequisites
- Supabase project (URL + anon and service role keys)
- Supabase CLI (optional for local dev)
- Google Cloud Document AI processor and service account JSON (for OCR features)

## 1) Apply the Database Schema

Use the comprehensive schema file in the repo root:

- `comprehensive-supabase-schema.sql` (canonical schema)

Apply it in Supabase SQL Editor or via CLI.

## 2) Storage Buckets

Storage bucket creation and RLS policies are included in `comprehensive-supabase-schema.sql` (passport-scans and processed-documents). Apply the schema and the buckets/policies will be provisioned.

Note: Bucket creation requires service-role permissions; running the schema in Supabase SQL Editor or via service-role is recommended.

## 3) Environment Variables

Set these at the project root `.env` (server-only values must NOT be exposed to the browser):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `ENCRYPTION_KEY` (server only; required for token encryption)
- Document AI configuration (one of):
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON` (service account JSON in a single env var), or
  - `DOCUMENT_AI_PROJECT_ID`, `DOCUMENT_AI_LOCATION`, `DOCUMENT_AI_PROCESSOR_ID`
- Gmail OAuth: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`
- Office365 OAuth: `OFFICE365_CLIENT_ID`, `OFFICE365_CLIENT_SECRET`, `OFFICE365_REDIRECT_URI`

## 4) Local Development

```
cd frontend
npm run dev
```

## 5) Production

- Host the Next.js app on Vercel or your Node platform of choice.
- Keep Supabase keys and `ENCRYPTION_KEY` in the platform’s secret manager.
- Ensure Document AI credentials are configured server-side only.

## Notes

- The project has migrated away from Firebase Functions/Firestore. Any remaining Firebase artifacts are deprecated.
