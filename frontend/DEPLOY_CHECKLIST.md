# NextAuth Migration Deployment Checklist

## Quick Start (TL;DR)

```bash
# 1. Apply migration to Railway PostgreSQL
# Copy contents of: prisma/migrations/add_nextauth_standard_fields.sql
# Paste into Railway PostgreSQL console and execute

# 2. Deploy to Railway
git add .
git commit -m "fix: Add NextAuth v4 Prisma adapter compatibility"
git push origin main

# 3. Test
# Visit: https://your-app.up.railway.app/auth/signin
# Try Google/Azure AD sign-in
```

---

## Detailed Checklist

### Pre-Deployment

- [x] ✅ Schema updated (`prisma/schema.prisma`)
- [x] ✅ Migration SQL created (`prisma/migrations/add_nextauth_standard_fields.sql`)
- [x] ✅ Auth config updated (`src/lib/auth.config.ts`)
- [x] ✅ Type definitions added (`types/next-auth.d.ts`)
- [x] ✅ Build succeeds locally (`npm run build`)
- [x] ✅ No TypeScript errors

### Deployment Steps

#### Step 1: Apply Database Migration

**Option A: Railway Console (Recommended)**
```bash
# 1. Open Railway dashboard
# 2. Go to PostgreSQL service
# 3. Click "Connect" → "PostgreSQL Console"
# 4. Copy contents of prisma/migrations/add_nextauth_standard_fields.sql
# 5. Paste and execute
# 6. Verify: SELECT name, image, email_verified FROM users LIMIT 1;
```

**Option B: Prisma CLI (If DATABASE_URL is accessible)**
```bash
# 1. Ensure .env.local has Railway DATABASE_URL
export DATABASE_URL="postgresql://postgres:dMLnKNdmNHoMFsuYXkSqGYSDzQZWFBYq@metro.proxy.rlwy.net:46220/railway"

# 2. Apply migration
npx prisma migrate deploy

# 3. Verify
npx prisma db pull
```

#### Step 2: Commit and Push

```bash
# Stage all changes
git add prisma/schema.prisma \
        src/lib/auth.config.ts \
        types/next-auth.d.ts \
        prisma/migrations/add_nextauth_standard_fields.sql \
        MIGRATION_SUMMARY.md \
        NEXTAUTH_MIGRATION_GUIDE.md \
        SCHEMA_COMPARISON.md \
        scripts/verify-nextauth-migration.sql

# Commit with conventional commit message
git commit -m "fix: Add NextAuth v4 Prisma adapter compatibility

- Add NextAuth standard fields (name, image, emailVerified) to User model
- Remove custom adapter override, use standard PrismaAdapter
- Add callbacks to sync NextAuth fields with custom fields
- Maintain backward compatibility with displayName/photoUrl

Fixes: OAuth sign-in errors, field validation errors
Migration: Additive only, zero data loss
"

# Push to main (Railway auto-deploys)
git push origin main
```

#### Step 3: Monitor Deployment

```bash
# Watch Railway logs
railway logs

# Look for:
# ✅ "Build succeeded"
# ✅ "Starting server"
# ❌ Any errors mentioning "prisma", "nextauth", "adapter"
```

### Post-Deployment Verification

#### Step 4: Test Authentication Flows

**Test 1: Google OAuth Sign-In**
```
1. Visit: https://your-app.up.railway.app/auth/signin
2. Click "Sign in with Google"
3. Authorize the app
4. Expected: Redirect to /dashboard
5. Check: User profile displays name and image
```

**Test 2: Azure AD OAuth Sign-In**
```
1. Click "Sign in with Microsoft"
2. Authorize the app
3. Expected: Redirect to /dashboard
4. Check: User profile displays correctly
```

**Test 3: Credentials Sign-In**
```
1. Enter email/password (if you have test account)
2. Submit
3. Expected: Redirect to /dashboard
4. Check: Session persists, user data populated
```

#### Step 5: Database Verification

```bash
# Connect to Railway PostgreSQL
railway run psql $DATABASE_URL

# Run verification script
\i scripts/verify-nextauth-migration.sql

# Expected output:
# - All 5 user columns exist (name, email_verified, image, display_name, photo_url)
# - Sync status shows "✅ Synced" for all users
# - No missing data
```

#### Step 6: Log Analysis

```bash
# Check Railway logs for errors
railway logs | grep -i "error\|fail\|exception"

# Expected: No adapter errors, no field validation errors

# Before migration (errors):
# ❌ "Unknown field 'name'"
# ❌ "Unknown field 'refresh_token_expires_in'"

# After migration (clean):
# ✅ No adapter errors
# ✅ User creation succeeds
# ✅ Account creation succeeds
```

### Rollback Procedure (If Needed)

#### Rollback Step 1: Revert Code
```bash
git revert HEAD
git push origin main
```

#### Rollback Step 2: Rollback Database
```sql
-- Run in Railway PostgreSQL console
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "name",
  DROP COLUMN IF EXISTS "email_verified",
  DROP COLUMN IF EXISTS "image";
```

**Note:** Original data (displayName, photoUrl) is unchanged, so rollback is safe.

---

## Success Criteria

### Required (Must Pass)
- [ ] Migration SQL executed without errors
- [ ] Build deploys successfully to Railway
- [ ] At least one OAuth provider sign-in works
- [ ] User profile data displays correctly
- [ ] No adapter errors in logs

### Recommended (Should Pass)
- [ ] All OAuth providers work (Google, Azure AD)
- [ ] Credentials sign-in works (if applicable)
- [ ] Existing users can still sign in
- [ ] New users are created successfully
- [ ] Sessions persist after page refresh

### Optional (Nice to Have)
- [ ] Email verification flow works (if implemented)
- [ ] Database sync shows all fields populated
- [ ] No console warnings in browser

---

## Troubleshooting

### Issue: Migration fails with "column already exists"
**Solution:**
```sql
-- Check if columns already exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('name', 'image', 'email_verified');

-- If they exist, skip migration (already applied)
```

### Issue: Build fails with type errors
**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate

# Rebuild
npm run build
```

### Issue: OAuth sign-in still fails
**Solution:**
1. Check Railway logs for exact error
2. Verify migration was applied: `SELECT name, image FROM users LIMIT 1;`
3. Check `src/lib/auth.config.ts` has no custom adapter override
4. Verify environment variables (GOOGLE_CLIENT_ID, etc.)

### Issue: User data not displaying
**Solution:**
```typescript
// Check which fields you're accessing in your UI
// If using displayName/photoUrl, they should still work
// If using name/image, they should now be populated

// Fallback pattern (safe):
const userName = user.name || user.displayName
const userPhoto = user.image || user.photoUrl
```

---

## Post-Migration Tasks

### Immediate (Within 24 hours)
- [ ] Monitor error rates in Railway logs
- [ ] Check user sign-in success rate
- [ ] Verify database sync (run verification script)
- [ ] Test all auth providers

### Short-term (Within 1 week)
- [ ] Review error logs for any edge cases
- [ ] Update any custom code referencing `displayName`/`photoUrl`
- [ ] Document any issues encountered
- [ ] Consider adding database triggers for field sync (optional)

### Long-term (3-6 months)
- [ ] Audit codebase for old field references
- [ ] Plan migration to NextAuth standard fields only
- [ ] Consider deprecating custom fields
- [ ] Remove sync callbacks if no longer needed

---

## Contact & Support

**Migration Documents:**
- Full guide: `NEXTAUTH_MIGRATION_GUIDE.md`
- Schema comparison: `SCHEMA_COMPARISON.md`
- Summary: `MIGRATION_SUMMARY.md`
- Verification script: `scripts/verify-nextauth-migration.sql`

**Database:**
- Railway PostgreSQL Console: https://railway.app → PostgreSQL service
- Connection string: See `.env.local` or Railway dashboard

**Logs:**
- Railway logs: `railway logs`
- Build logs: Railway dashboard → Deployments tab
- PostgreSQL logs: Railway dashboard → PostgreSQL service → Logs

---

## Final Pre-Deploy Command

```bash
# One-command deploy (after migration SQL applied to Railway)
npm run build && \
git add . && \
git commit -m "fix: Add NextAuth v4 Prisma adapter compatibility" && \
git push origin main && \
railway logs --follow
```

**Expected Timeline:**
- Build: 2-3 minutes
- Deploy: 1-2 minutes
- Health check: 30 seconds
- **Total:** ~5 minutes to production

---

## Status: ✅ READY TO DEPLOY

All pre-deployment checks passed. Migration is safe and production-ready.

**Next Action:** Apply migration SQL to Railway PostgreSQL, then push to deploy.
