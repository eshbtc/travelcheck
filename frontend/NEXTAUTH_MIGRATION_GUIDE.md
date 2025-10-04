# NextAuth v4 Prisma Schema Migration Guide

## Overview

This migration updates the User model to be fully compatible with NextAuth v4's PrismaAdapter while preserving all existing custom fields and data.

## Problem Statement

The original schema was designed for Supabase and had field name mismatches with NextAuth's expected schema:
- `displayName` instead of `name`
- `photoUrl` instead of `image`
- Missing `emailVerified` field

This caused adapter errors when creating users and accounts via OAuth.

## Solution: Additive Migration (Zero Data Loss)

We've added the NextAuth standard fields (`name`, `image`, `emailVerified`) alongside the existing custom fields (`displayName`, `photoUrl`). The fields are kept in sync via callbacks.

---

## Migration Steps

### 1. **Apply Database Migration**

Run the SQL migration to add the three new columns:

```bash
# Option A: Using Prisma (recommended if DB is accessible)
npx prisma migrate deploy

# Option B: Manual SQL execution (if deploying to Railway directly)
# Execute: prisma/migrations/add_nextauth_standard_fields.sql
```

The migration does:
1. Adds `name`, `email_verified`, `image` columns to `users` table
2. Backfills `name` from `display_name` and `image` from `photo_url`
3. Creates indexes for performance
4. Adds documentation comments

### 2. **Verify Schema Changes**

After migration, verify the columns exist:

```sql
\d users;  -- PostgreSQL
-- Should show: name, email_verified, image columns
```

### 3. **Deploy Updated Code**

The following files have been updated:

**Schema:**
- `prisma/schema.prisma` - Added NextAuth standard fields to User model

**Auth Configuration:**
- `src/lib/auth.config.ts` - Removed custom adapter override, added field sync callbacks

### 4. **Test Authentication Flow**

Test all auth providers:

**Google OAuth:**
```bash
# Sign in with Google
# Verify user record has both name/displayName and image/photoUrl populated
```

**Azure AD OAuth:**
```bash
# Sign in with Azure AD
# Verify same field sync behavior
```

**Credentials (Email/Password):**
```bash
# Sign in with credentials
# Verify fallback logic works (name || displayName)
```

### 5. **Monitor for Errors**

Check logs for:
- ✅ No more `refresh_token_expires_in` errors
- ✅ No more field validation errors on user/account creation
- ✅ Sessions persist correctly
- ✅ User profile data displays properly

---

## Field Mapping Strategy

### Current State (Dual Fields)

| NextAuth Standard | Custom Field | Sync Strategy |
|-------------------|--------------|---------------|
| `name` | `displayName` | Synced on sign-in via callback |
| `image` | `photoUrl` | Synced on sign-in via callback |
| `emailVerified` | N/A | Set by NextAuth on email verification |

### Code References Update Needed

If your application code references `displayName` or `photoUrl`, you have two options:

**Option A: Keep using custom fields (backward compatible)**
```typescript
// Existing code continues to work
const userName = user.displayName
const userPhoto = user.photoUrl
```

**Option B: Migrate to NextAuth standard fields (recommended)**
```typescript
// Update code to use NextAuth standard fields
const userName = user.name
const userPhoto = user.image
```

**Option C: Support both with fallback**
```typescript
// Safest during transition
const userName = user.name || user.displayName
const userPhoto = user.image || user.photoUrl
```

---

## Rollback Plan

If issues occur, rollback is safe:

### Database Rollback
```sql
-- Remove added columns (data in displayName/photoUrl is unchanged)
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "name",
  DROP COLUMN IF EXISTS "email_verified",
  DROP COLUMN IF EXISTS "image";
```

### Code Rollback
```bash
git revert <commit-hash>  # Revert auth.config.ts and schema.prisma changes
```

---

## Expected Behavior After Migration

### User Creation (OAuth)

**Before (Failed):**
```
Error: Unknown field 'refresh_token_expires_in'
Error: Field 'displayName' not found in User model
```

**After (Success):**
```typescript
// NextAuth PrismaAdapter automatically creates:
{
  id: "uuid",
  email: "user@example.com",
  name: "John Doe",           // From OAuth profile
  image: "https://...",       // From OAuth profile
  emailVerified: new Date(),  // Set on email verification

  // Custom fields synced via callback:
  displayName: "John Doe",
  photoUrl: "https://...",
  provider: "google",
  role: "user",
  lastLogin: new Date()
}
```

### Account Creation (OAuth)

**Before (Failed):**
```
Error: Field 'refresh_token_expires_in' not in Account model
```

**After (Success):**
```typescript
// All standard NextAuth fields work:
{
  id: "uuid",
  userId: "uuid",
  type: "oauth",
  provider: "google",
  providerAccountId: "123456",
  access_token: "...",
  refresh_token: "...",
  expires_at: 1234567890,
  token_type: "Bearer",
  scope: "openid email profile",
  id_token: "...",
  session_state: null
}
```

---

## Future Cleanup (Optional)

Once all code references are migrated to use `name`/`image`, you can:

1. **Deprecate custom fields** (add migration to drop `displayName`, `photoUrl`)
2. **Update all code** to only use NextAuth standard fields
3. **Remove field sync callbacks** (no longer needed)

**Timeline:** This can be done in a separate migration after validating the current changes work correctly.

---

## Verification Checklist

- [ ] Migration SQL executed successfully
- [ ] Prisma schema regenerated (`npx prisma generate`)
- [ ] Google OAuth sign-in works
- [ ] Azure AD OAuth sign-in works
- [ ] Credentials sign-in works
- [ ] User profile data displays correctly
- [ ] No adapter errors in logs
- [ ] Sessions persist correctly
- [ ] Email verification flow works (if implemented)
- [ ] Existing users can still sign in
- [ ] New users are created successfully

---

## Database Connection String

**Railway PostgreSQL:**
```
postgresql://postgres:dMLnKNdmNHoMFsuYXkSqGYSDzQZWFBYq@metro.proxy.rlwy.net:46220/railway
```

Set in `.env.local`:
```bash
DATABASE_URL="postgresql://postgres:dMLnKNdmNHoMFsuYXkSqGYSDzQZWFBYq@metro.proxy.rlwy.net:46220/railway"
```

---

## Support & Troubleshooting

### Error: "Adapter method 'createUser' failed"
**Cause:** Migration not applied
**Fix:** Run migration SQL or `npx prisma migrate deploy`

### Error: "Unknown field 'displayName'"
**Cause:** Using old custom adapter
**Fix:** Ensure auth.config.ts uses standard `PrismaAdapter(prisma)` without overrides

### Error: "Column 'name' does not exist"
**Cause:** Migration not applied to database
**Fix:** Apply migration SQL to Railway database

### Users have null `name` or `image`
**Cause:** Existing users created before migration
**Fix:** Run backfill query in migration SQL or sign out/in to trigger sync

---

## References

- [NextAuth v4 Prisma Adapter Docs](https://authjs.dev/reference/adapter/prisma)
- [Prisma Migration Guide](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate)
- [NextAuth Callbacks](https://next-auth.js.org/configuration/callbacks)
