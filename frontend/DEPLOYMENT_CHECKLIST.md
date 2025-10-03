# Railway Deployment Checklist - TravelCheck

**Project:** travel-check
**Project ID:** `dd71bd50-adda-44ab-b23b-af2fd879b5bb`
**Environment:** production
**Status:** ✅ Linked locally

---

## ✅ Completed Steps

- [x] Code migration from Supabase to Prisma/NextAuth
- [x] Prisma schema defined (26 models)
- [x] TypeScript compilation successful (0 errors)
- [x] Production build successful
- [x] Railway project linked locally
- [x] Environment configuration documented
- [x] Deployment guides created

---

## 🚀 Manual Deployment Steps

### Step 1: Add PostgreSQL Database (Railway Dashboard)

1. Go to [Railway Dashboard](https://railway.app/project/dd71bd50-adda-44ab-b23b-af2fd879b5bb)
2. Click **"+ New"** → **Database** → **PostgreSQL**
3. Wait for PostgreSQL to provision (~30 seconds)
4. The `DATABASE_URL` variable will be automatically created

**Verify:**
```bash
railway variables | grep DATABASE_URL
```

---

### Step 2: Create Application Service

1. In Railway dashboard, click **"+ New"** → **Empty Service**
2. Name it: `travel-check-frontend` or `web`
3. Connect it to your GitHub repository (recommended) OR deploy via CLI

**Option A: GitHub Integration (Recommended)**
1. Click on the new service
2. Go to **Settings** → **Source**
3. Click **Connect Repo**
4. Select your GitHub repository
5. Set **Root Directory**: `frontend` (if in monorepo) or `/` (if standalone)
6. Railway will auto-deploy on every push to `main`

**Option B: CLI Deployment**
```bash
# From the frontend directory
railway up
```

---

### Step 3: Configure Environment Variables

Go to the service → **Variables** tab and add these variables:

**Required Variables:**

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-railway-domain.up.railway.app

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Azure AD OAuth
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=your-azure-tenant-id

# Gmail Integration
GMAIL_CLIENT_ID=your-gmail-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REDIRECT_URI=https://your-railway-domain.up.railway.app/auth/callback?provider=gmail

# Office 365 Integration
OFFICE365_CLIENT_ID=your-office365-client-id
OFFICE365_CLIENT_SECRET=your-office365-client-secret
OFFICE365_REDIRECT_URI=https://your-railway-domain.up.railway.app/auth/callback?provider=office365

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=travel-check-uploads
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Google AI
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Application Config
NEXT_PUBLIC_APP_NAME=TravelCheck
NEXT_PUBLIC_APP_URL=https://your-railway-domain.up.railway.app
ADMIN_EMAILS=your-admin-email@domain.com
NEXT_PUBLIC_ADMIN_EMAILS=your-admin-email@domain.com

# CRON Secret
CRON_SECRET=<generate with: openssl rand -hex 32>

# Node Environment
NODE_ENV=production

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_SUGGESTIONS=true
NEXT_PUBLIC_ENABLE_DUPLICATE_DETECTION=true
NEXT_PUBLIC_ENABLE_BATCH_PROCESSING=true
NEXT_PUBLIC_ENABLE_EMAIL_INTEGRATION=true
```

**Note:** Railway automatically injects `DATABASE_URL` from the PostgreSQL plugin.

---

### Step 4: Run Database Migrations

**Option A: Via Railway CLI**
```bash
railway run npx prisma db push
```

**Option B: Via Railway Dashboard**
1. Go to service → **Settings** → **Deploy**
2. Add **Build Command**:
   ```
   npm install && npx prisma generate && npm run build
   ```
3. Add **Start Command**:
   ```
   npx prisma db push && npm start
   ```

**Note:** For production, use proper migrations:
```bash
railway run npx prisma migrate deploy
```

---

### Step 5: Deploy the Application

**If using GitHub integration:**
- Push your code to the `main` branch
- Railway will automatically build and deploy

**If using CLI:**
```bash
railway up
```

**Monitor deployment:**
```bash
railway logs --follow
```

---

### Step 6: Verify Deployment

1. **Get the deployment URL:**
   - Go to service → **Settings** → **Domains**
   - Copy the Railway-provided domain (e.g., `travel-check.up.railway.app`)

2. **Health Check:**
   ```bash
   curl https://your-domain.up.railway.app/api/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2024-10-03T...",
     "database": "connected",
     "environment": "production"
   }
   ```

3. **Test Authentication:**
   - Visit `https://your-domain.up.railway.app/auth/login`
   - Try logging in with Google or Azure AD
   - Verify user creation in database

4. **Test File Upload:**
   - Upload a passport image
   - Verify it's stored in Cloudflare R2
   - Check database for scan record

---

### Step 7: Update OAuth Redirect URIs

After getting your Railway domain, update redirect URIs in:

**Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add Authorized redirect URIs:
   - `https://your-domain.up.railway.app/api/auth/callback/google`
   - `https://your-domain.up.railway.app/auth/callback?provider=gmail`

**Azure Portal:**
1. Go to [Azure Portal](https://portal.azure.com)
2. App Registrations → Your App
3. Authentication → Add redirect URI:
   - `https://your-domain.up.railway.app/api/auth/callback/azure-ad`
   - `https://your-domain.up.railway.app/auth/callback?provider=office365`

---

### Step 8: Configure Custom Domain (Optional)

1. **Add custom domain in Railway:**
   - Service → Settings → Domains
   - Click **Custom Domain**
   - Enter your domain (e.g., `travelcheck.com`)

2. **Add DNS records:**
   - Add CNAME record pointing to Railway domain
   - Example: `CNAME @ your-app.up.railway.app`

3. **Update environment variables:**
   ```bash
   NEXTAUTH_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   GMAIL_REDIRECT_URI=https://yourdomain.com/auth/callback?provider=gmail
   OFFICE365_REDIRECT_URI=https://yourdomain.com/auth/callback?provider=office365
   ```

4. **Update OAuth redirect URIs** (repeat Step 7 with new domain)

---

## 📊 Post-Deployment Monitoring

### Check Logs
```bash
railway logs --tail 100
```

### Monitor Metrics
- Go to service → **Metrics** tab
- Monitor CPU, Memory, Network usage

### Database Connection
```bash
railway run npx prisma studio
```

---

## 🔧 Troubleshooting

### Build Failures

**Check build logs:**
```bash
railway logs | grep -i error
```

**Common issues:**
- Missing environment variables → Check Variables tab
- Database connection failed → Verify PostgreSQL is running
- Node version mismatch → Add `engines` in package.json

### Runtime Errors

**Check application logs:**
```bash
railway logs --follow
```

**Common issues:**
- NextAuth errors → Verify `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
- Database errors → Check `DATABASE_URL` and run migrations
- OAuth errors → Verify redirect URIs match exactly

### Database Issues

**Check database connectivity:**
```bash
railway run npx prisma db pull
```

**Reset database (WARNING: deletes all data):**
```bash
railway run npx prisma migrate reset
```

---

## 🎯 Success Criteria

- [ ] PostgreSQL database is provisioned
- [ ] Service is deployed and running
- [ ] `/api/health` returns `{"status": "healthy", "database": "connected"}`
- [ ] Can log in with Google OAuth
- [ ] Can log in with Azure AD
- [ ] Can upload passport images
- [ ] Images are stored in Cloudflare R2
- [ ] Database records are created correctly
- [ ] All API endpoints respond correctly

---

## 📝 Next Steps After Deployment

1. **Setup Monitoring:**
   - Add Sentry for error tracking
   - Add PostHog for analytics

2. **Setup CRON Jobs:**
   - Use external service (cron-job.org) or GitHub Actions
   - Call `/api/cron/cleanup` endpoint daily

3. **Performance Optimization:**
   - Enable caching headers
   - Add CDN for static assets

4. **Security:**
   - Add rate limiting
   - Enable CORS protection
   - Regular security audits

---

## 🆘 Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: GitHub Issues

---

**Last Updated:** October 3, 2024
**Migration Status:** ✅ Complete - Ready for Deployment
