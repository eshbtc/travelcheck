# Railway Deployment Guide

This guide covers deploying the TravelCheck application to Railway with PostgreSQL and all required services.

## Prerequisites

- Railway account ([railway.app](https://railway.app))
- Railway CLI installed: `npm install -g @railway/cli`
- All OAuth credentials configured (Google, Azure AD)
- Cloudflare R2 bucket created for file storage

## Step 1: Initial Railway Setup

### 1.1 Login to Railway

```bash
railway login
```

### 1.2 Initialize Railway Project

```bash
# From the frontend directory
railway init
```

Select or create a new project named `travel-check` (or your preferred name).

### 1.3 Link to Production Environment

```bash
railway environment
```

Select `production` or create a new environment.

## Step 2: Add PostgreSQL Database

### 2.1 Add PostgreSQL Plugin

```bash
railway add
```

Select **PostgreSQL** from the list of available plugins.

### 2.2 Verify Database Connection

Railway will automatically create a `DATABASE_URL` variable. Verify it:

```bash
railway variables
```

You should see:
```
DATABASE_URL=postgresql://postgres:***@containers-us-west-###.railway.app:####/railway
```

## Step 3: Configure Environment Variables

### 3.1 Required Variables

Set all required environment variables using the Railway CLI or dashboard:

```bash
# NextAuth Configuration
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
railway variables set NEXTAUTH_URL=https://your-app.railway.app

# Google OAuth
railway variables set GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
railway variables set GOOGLE_CLIENT_SECRET=your-google-client-secret

# Azure AD OAuth
railway variables set AZURE_AD_CLIENT_ID=your-azure-client-id
railway variables set AZURE_AD_CLIENT_SECRET=your-azure-client-secret
railway variables set AZURE_AD_TENANT_ID=your-azure-tenant-id

# Gmail Integration
railway variables set GMAIL_CLIENT_ID=your-gmail-client-id.apps.googleusercontent.com
railway variables set GMAIL_CLIENT_SECRET=your-gmail-client-secret
railway variables set GMAIL_REDIRECT_URI=https://your-app.railway.app/auth/callback?provider=gmail

# Office 365 Integration
railway variables set OFFICE365_CLIENT_ID=your-office365-client-id
railway variables set OFFICE365_CLIENT_SECRET=your-office365-client-secret
railway variables set OFFICE365_REDIRECT_URI=https://your-app.railway.app/auth/callback?provider=office365

# Cloudflare R2 Storage
railway variables set R2_ACCOUNT_ID=your-cloudflare-account-id
railway variables set R2_ACCESS_KEY_ID=your-r2-access-key-id
railway variables set R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
railway variables set R2_BUCKET_NAME=travel-check-uploads
railway variables set R2_PUBLIC_URL=https://your-bucket.r2.dev

# Google AI
railway variables set GOOGLE_AI_API_KEY=your-google-ai-api-key

# Application Config
railway variables set NEXT_PUBLIC_APP_NAME=TravelCheck
railway variables set NEXT_PUBLIC_APP_URL=https://your-app.railway.app
railway variables set ADMIN_EMAILS=admin@yourdomain.com
railway variables set NEXT_PUBLIC_ADMIN_EMAILS=admin@yourdomain.com

# CRON Secret
railway variables set CRON_SECRET=$(openssl rand -hex 32)

# Node Environment
railway variables set NODE_ENV=production

# Feature Flags
railway variables set NEXT_PUBLIC_ENABLE_AI_SUGGESTIONS=true
railway variables set NEXT_PUBLIC_ENABLE_DUPLICATE_DETECTION=true
railway variables set NEXT_PUBLIC_ENABLE_BATCH_PROCESSING=true
railway variables set NEXT_PUBLIC_ENABLE_EMAIL_INTEGRATION=true
```

### 3.2 Alternative: Use Railway Dashboard

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Select your project
3. Click on **Variables** tab
4. Add variables one by one using the UI

### 3.3 Verify All Variables Are Set

```bash
railway variables | grep -E "(DATABASE_URL|NEXTAUTH|GOOGLE|AZURE|GMAIL|OFFICE365|R2_|CRON)"
```

## Step 4: Run Database Migrations

### 4.1 Generate Prisma Client

```bash
npx prisma generate
```

### 4.2 Push Schema to Railway Database

```bash
railway run npx prisma db push
```

Or use migrations:

```bash
railway run npx prisma migrate deploy
```

### 4.3 Verify Database Schema

```bash
railway run npx prisma studio
```

This opens Prisma Studio connected to your Railway database.

## Step 5: Deploy Application

### 5.1 Deploy via Railway CLI

```bash
railway up
```

This will:
1. Build your Next.js application
2. Deploy to Railway
3. Provide a deployment URL

### 5.2 Alternative: Deploy via Git

Connect your GitHub repository:

```bash
railway link
```

Then push to main branch:

```bash
git push origin main
```

Railway will automatically build and deploy on every push.

### 5.3 Monitor Deployment

```bash
railway logs
```

Or view logs in the Railway dashboard.

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Custom Domain

```bash
railway domain
```

Or in the Railway dashboard:
1. Go to **Settings** → **Domains**
2. Click **Generate Domain** for a Railway subdomain
3. Or click **Custom Domain** to add your own domain

### 6.2 Update Environment Variables

If you added a custom domain, update:

```bash
railway variables set NEXTAUTH_URL=https://yourdomain.com
railway variables set NEXT_PUBLIC_APP_URL=https://yourdomain.com
railway variables set GMAIL_REDIRECT_URI=https://yourdomain.com/auth/callback?provider=gmail
railway variables set OFFICE365_REDIRECT_URI=https://yourdomain.com/auth/callback?provider=office365
```

### 6.3 Update OAuth Redirect URIs

Update redirect URIs in:
- **Google Cloud Console** → APIs & Services → Credentials
- **Azure Portal** → App Registrations → Authentication

## Step 7: Post-Deployment Verification

### 7.1 Health Check

Visit `https://your-app.railway.app/api/health` to verify the API is running.

### 7.2 Database Connection Test

Visit `https://your-app.railway.app/api/db-test` (if you created this endpoint).

### 7.3 Test Authentication

1. Visit `https://your-app.railway.app/auth/login`
2. Try logging in with Google or Azure AD
3. Verify user is created in database

### 7.4 Test File Upload

1. Upload a passport image
2. Verify it's stored in Cloudflare R2
3. Check database for scan record

## Step 8: Setup CRON Jobs (Optional)

Railway doesn't have built-in CRON, so use an external service like:

### Option A: Railway CRON (via external service)

Use a service like [cron-job.org](https://cron-job.org) to call your CRON endpoints:

```
GET https://your-app.railway.app/api/cron/cleanup
Headers: Authorization: Bearer YOUR_CRON_SECRET
```

### Option B: GitHub Actions

Create `.github/workflows/cron.yml`:

```yaml
name: CRON Jobs

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-app.railway.app/api/cron/cleanup
```

## Step 9: Monitoring & Logging

### 9.1 Railway Logs

```bash
railway logs --follow
```

### 9.2 Add Sentry (Optional)

```bash
railway variables set SENTRY_DSN=your-sentry-dsn
railway variables set NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### 9.3 Add PostHog Analytics (Optional)

```bash
railway variables set NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
railway variables set NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
railway run npx prisma db pull

# View database URL
railway variables | grep DATABASE_URL
```

### Build Failures

```bash
# View build logs
railway logs

# Check Node version
railway run node --version

# Verify dependencies
railway run npm list
```

### Environment Variable Issues

```bash
# List all variables
railway variables

# Update a variable
railway variables set VARIABLE_NAME=new-value

# Delete a variable
railway variables delete VARIABLE_NAME
```

### Migration Failures

```bash
# Reset database (WARNING: deletes all data)
railway run npx prisma migrate reset

# Re-run migrations
railway run npx prisma migrate deploy

# Check migration status
railway run npx prisma migrate status
```

## Rollback Strategy

### Rollback to Previous Deployment

```bash
# View deployments
railway status

# Rollback via dashboard
# Go to Deployments tab → Select previous deployment → Redeploy
```

### Database Rollback

```bash
# If using migrations, rollback to previous migration
railway run npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

## Cost Estimation

Railway pricing (as of 2024):

- **Starter Plan**: $5/month
  - 500 hours execution time
  - 8GB RAM
  - 8GB storage

- **PostgreSQL Plugin**: Included in Starter plan
  - 1GB database storage
  - Additional storage: $0.25/GB/month

- **Estimated Monthly Cost**: ~$5-10/month for small to medium usage

## Next Steps

1. ✅ Configure all environment variables
2. ✅ Run database migrations
3. ✅ Deploy application
4. ✅ Verify authentication works
5. ✅ Test file uploads
6. ✅ Setup monitoring
7. ✅ Configure custom domain (optional)
8. ✅ Setup CRON jobs (optional)

## Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Community: [discord.gg/railway](https://discord.gg/railway)
- Project Issues: [GitHub Issues](https://github.com/your-repo/issues)
