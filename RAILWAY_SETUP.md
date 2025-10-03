# Railway Developer Setup Guide

This guide helps developers set up their local environment for the Railway-based Travel Check application.

---

## Prerequisites

- **Node.js**: 20.x or higher (22.x recommended)
- **npm**: 10.x or higher
- **Git**: Latest version
- **Railway CLI**: Install with `npm install -g @railway/cli`
- **Cloudflare Account**: For R2 storage

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd travel-check/frontend
```

---

## 2. Install Dependencies

```bash
npm install
```

**Expected Output**:
```
added 850 packages in 45s
```

**Key Dependencies**:
- Next.js 14
- NextAuth.js 4.24+
- Prisma 6.16+
- AWS SDK (for R2)
- TypeScript 5.x

---

## 3. Set Up Railway Postgres Database

### Option A: Use Railway CLI (Recommended)

1. **Login to Railway**:
   ```bash
   railway login
   ```

2. **Create New Project** (or link existing):
   ```bash
   railway init
   ```

3. **Add Postgres Service**:
   ```bash
   railway add postgres
   ```

4. **Get Database URL**:
   ```bash
   railway variables
   ```
   Copy the `DATABASE_URL` value.

### Option B: Use Railway Web Dashboard

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL service
4. Copy `DATABASE_URL` from Variables tab

---

## 4. Set Up Cloudflare R2 Storage

### Create R2 Bucket

1. **Login to Cloudflare Dashboard**: [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Navigate to R2**: Left sidebar → R2
3. **Create Bucket**:
   - Click "Create bucket"
   - Name: `travel-check-storage` (or your preference)
   - Location: Automatic
   - Click "Create bucket"

### Create API Token

1. **Go to R2 Settings**: Click "Manage R2 API Tokens"
2. **Create API Token**:
   - Click "Create API Token"
   - Permissions: Object Read & Write
   - TTL: Never (or set expiry)
   - Click "Create API Token"
3. **Copy Credentials**:
   - Access Key ID
   - Secret Access Key
   - (You can only see the secret once!)

### Configure CORS (Optional for Public Files)

```bash
# Using wrangler CLI
npx wrangler r2 bucket cors put travel-check-storage \
  --rules '[{"AllowedOrigins": ["*"], "AllowedMethods": ["GET", "PUT"], "AllowedHeaders": ["*"]}]'
```

---

## 5. Configure Environment Variables

### Create `.env.local`

Copy the example file:
```bash
cp .env.example .env.local
```

### Fill in Required Variables

```bash
# Database (from Railway)
DATABASE_URL="postgresql://postgres:password@postgres.railway.internal:5432/railway"

# NextAuth (generate secrets)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-command-below"
ENCRYPTION_KEY="generate-with-command-below"

# Cloudflare R2 (from R2 dashboard)
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="r2-access-key-id-here"
R2_SECRET_ACCESS_KEY="r2-secret-access-key-here"
R2_BUCKET_NAME="travel-check-storage"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"  # Optional, from R2 settings

# OAuth Providers (from Google Cloud / Azure Portal)
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
AZURE_AD_CLIENT_ID="xxx-xxx-xxx"
AZURE_AD_CLIENT_SECRET="xxx"
AZURE_AD_TENANT_ID="xxx-xxx-xxx"

# Google Cloud (for Document AI)
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_APPLICATION_CREDENTIALS="./key.json"
DOCUMENT_AI_PROCESSOR_ID="xxx"
VERTEX_AI_LOCATION="us-central1"

# Optional: Admin emails (comma-separated)
ADMIN_EMAILS="admin@example.com,you@example.com"
```

### Generate Secrets

```bash
# Generate NEXTAUTH_SECRET (32+ characters)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (32+ characters)
openssl rand -base64 32
```

---

## 6. Set Up OAuth Providers

### Google OAuth

1. **Go to Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com)
2. **Create Project** (if needed)
3. **Enable Google+ API**:
   - APIs & Services → Library
   - Search "Google+ API"
   - Click "Enable"
4. **Create OAuth Credentials**:
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Name: "Travel Check"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://your-app.railway.app/api/auth/callback/google` (production)
   - Click "Create"
5. **Copy Credentials**: Client ID and Client Secret → `.env.local`

### Azure AD OAuth

1. **Go to Azure Portal**: [portal.azure.com](https://portal.azure.com)
2. **Navigate to Azure AD**: Azure Active Directory
3. **Register Application**:
   - App registrations → New registration
   - Name: "Travel Check"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI (Web): `http://localhost:3000/api/auth/callback/azure-ad`
   - Click "Register"
4. **Copy Application (client) ID** → `AZURE_AD_CLIENT_ID`
5. **Copy Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
6. **Create Client Secret**:
   - Certificates & secrets → New client secret
   - Description: "NextAuth"
   - Expires: 24 months
   - Click "Add"
   - Copy the **Value** → `AZURE_AD_CLIENT_SECRET` (only shown once!)
7. **Add Redirect URIs** (for production):
   - Authentication → Add platform → Web
   - Redirect URIs: `https://your-app.railway.app/api/auth/callback/azure-ad`

---

## 7. Initialize Database with Prisma

### Run Migrations

```bash
npx prisma migrate dev --name init
```

**Expected Output**:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "railway", schema "public"

Applying migration `20231002000000_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20231002000000_init/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v6.16.3) to ./node_modules/@prisma/client in 78ms
```

### Verify Database Schema

```bash
npx prisma studio
```

This opens a GUI at `http://localhost:5555` to browse your database.

### Seed Database (Optional)

If you need test data:
```bash
npx prisma db seed
```

---

## 8. Run Development Server

```bash
npm run dev
```

**Expected Output**:
```
   ▲ Next.js 14.x
   - Local:        http://localhost:3000
   - Network:      http://192.168.1.x:3000

 ✓ Ready in 2.5s
```

**Visit**: [http://localhost:3000](http://localhost:3000)

---

## 9. Verify Setup

### Test Checklist

- [ ] App loads at `http://localhost:3000`
- [ ] No console errors in browser DevTools
- [ ] Can click "Sign in with Google" (redirects to Google)
- [ ] Can click "Sign in with Microsoft" (redirects to Microsoft)
- [ ] Prisma Studio accessible at `http://localhost:5555`
- [ ] Database connection working (check API routes)

### Test OAuth Flow

1. Click "Sign in with Google"
2. Complete OAuth consent
3. Should redirect to `/dashboard`
4. Check that session is persisted (refresh page, still logged in)
5. Click "Sign out"
6. Should redirect to home page

---

## 10. Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Expected**: 50+ tests passing, >80% coverage

---

## 11. Building for Production

```bash
# Build the app
npm run build

# Preview production build
npm start
```

**Expected Output**:
```bash
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (15/15)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    1.2 kB         90 kB
├ ○ /api/auth/[...nextauth]              0 B                0 B
└ ○ /dashboard                           2.5 kB         95 kB
```

---

## 12. Deploying to Railway

### Using Railway CLI

```bash
# Login
railway login

# Link to project
railway link

# Set environment variables
railway variables set NEXTAUTH_URL=https://your-app.railway.app
railway variables set NEXTAUTH_SECRET=<your-secret>
railway variables set ENCRYPTION_KEY=<your-key>
# ... (set all variables from .env.local)

# Deploy
railway up
```

### Using Git Integration

1. **Connect GitHub**: Railway dashboard → Settings → Connect GitHub repo
2. **Set Variables**: Variables tab → Add all from `.env.local`
3. **Deploy**: Push to `main` branch → Auto-deploy

---

## Troubleshooting

### "DATABASE_URL is not defined"

**Solution**: Ensure `.env.local` exists and contains `DATABASE_URL`.

```bash
# Verify environment variables are loaded
npx prisma validate
```

### "Prisma Client could not locate your Prisma Schema file"

**Solution**: Run `npx prisma generate` to regenerate the client.

```bash
npx prisma generate
```

### "Failed to fetch signing keys from Google"

**Solution**: Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct.

### "R2 bucket not found"

**Solution**:
1. Verify `R2_BUCKET_NAME` matches the actual bucket name
2. Verify `R2_ACCOUNT_ID` is your Cloudflare account ID (found in R2 dashboard URL)

### NextAuth "NEXTAUTH_SECRET" Error

**Solution**: Generate a new secret and add to `.env.local`:

```bash
openssl rand -base64 32
```

### OAuth "redirect_uri_mismatch"

**Solution**: Ensure redirect URIs match exactly in OAuth provider settings:
- Google: `http://localhost:3000/api/auth/callback/google`
- Azure: `http://localhost:3000/api/auth/callback/azure-ad`

### Prisma Migration Failed

**Solution**: Reset database and re-run migrations:

```bash
npx prisma migrate reset
npx prisma migrate dev
```

⚠️ **Warning**: This deletes all data (fine for development).

---

## Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm start                      # Run production build

# Database
npx prisma studio             # Browse database in GUI
npx prisma migrate dev        # Create and apply migrations
npx prisma generate           # Regenerate Prisma Client
npx prisma db push            # Push schema without migrations (dev only)
npx prisma db pull            # Introspect database to update schema

# Testing
npm test                      # Run tests once
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Generate coverage report

# Linting
npm run lint                  # Run ESLint
npm run format                # Run Prettier

# Railway
railway login                 # Login to Railway
railway link                  # Link to project
railway up                    # Deploy to Railway
railway logs                  # View deployment logs
railway run npm run dev       # Run dev server with Railway env vars
```

---

## Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   └── auth/             # NextAuth routes
│   ├── (shell)/              # Authenticated app shell
│   │   ├── dashboard/
│   │   ├── travel/
│   │   └── reports/
│   └── layout.tsx
├── lib/                      # Core libraries
│   ├── auth.ts               # Auth helpers
│   ├── auth.config.ts        # NextAuth config
│   ├── prisma.ts             # Prisma client
│   ├── storage/              # Storage services
│   │   ├── r2.ts             # R2 service
│   │   └── types.ts          # Storage types
│   └── env.ts                # Environment validation
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── src/
│   ├── components/           # React components
│   ├── hooks/                # Custom hooks
│   └── utils/                # Utility functions
└── tests/                    # Test files
```

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Railway Documentation](https://docs.railway.app)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2)

---

**Need Help?**

- Check existing issues in the repository
- Review migration guide: `RAILWAY_MIGRATION_GUIDE.md`
- Review Prisma migration docs: `frontend/prisma/MIGRATION.md`

---

**Last Updated**: 2025-10-02
