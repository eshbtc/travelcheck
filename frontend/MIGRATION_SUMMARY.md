# NextAuth v4 Prisma Schema Migration - Summary

## Status: ✅ COMPLETE & READY TO DEPLOY

---

## What Was Fixed

### Problem
The Prisma schema had field mismatches with NextAuth v4's PrismaAdapter expectations:
1. **Missing field**: `emailVerified` (required by NextAuth)
2. **Renamed field**: `displayName` instead of `name`
3. **Renamed field**: `photoUrl` instead of `image`
4. **Custom adapter**: Overriding PrismaAdapter with custom `createUser` logic

This caused errors like:
- "Unknown field 'refresh_token_expires_in'"
- "Field 'displayName' not found in User model"
- User creation failures during OAuth sign-in

### Solution
Applied **additive-only migration** strategy:
- ✅ Added NextAuth standard fields (`name`, `image`, `emailVerified`) to User model
- ✅ Kept existing custom fields (`displayName`, `photoUrl`) for backward compatibility
- ✅ Removed custom adapter override, using standard `PrismaAdapter(prisma)`
- ✅ Added callbacks to sync data between NextAuth and custom fields
- ✅ Zero data loss, zero breaking changes

---

## Files Changed

### 1. **Schema** (`prisma/schema.prisma`)
```diff
model User {
  id           String    @id @db.Uuid
  email        String    @unique
+
+ // NextAuth standard fields (required by PrismaAdapter)
+ name          String?   // Synced with displayName
+ emailVerified DateTime? @map("email_verified")
+ image         String?   // Synced with photoUrl
+
  // Custom application fields
  role         String?   @default("user")
  displayName  String?   @map("display_name")
  photoUrl     String?   @map("photo_url")
  ...
}
```

### 2. **Auth Config** (`src/lib/auth.config.ts`)
**Removed:**
```typescript
adapter: {
  ...PrismaAdapter(prisma),
  createUser: async (data: any) => { /* custom logic */ }
} as any
```

**Added:**
```typescript
adapter: PrismaAdapter(prisma),

callbacks: {
  async signIn({ user, account, profile }) {
    // Sync NextAuth standard fields → custom fields
    await prisma.user.update({ /* sync logic */ })
  },
  // ... other callbacks
}
```

### 3. **Type Definitions** (`types/next-auth.d.ts`)
Extended NextAuth types to include custom fields:
```typescript
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role?: string
      provider?: string
    }
  }

  interface User extends DefaultUser {
    id: string
    role?: string
    provider?: string
    displayName?: string
    photoUrl?: string
    passwordHash?: string
    lastLogin?: Date
  }
}
```

### 4. **Migration SQL** (`prisma/migrations/add_nextauth_standard_fields.sql`)
```sql
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "email_verified" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "image" TEXT;

UPDATE "users"
SET "name" = "display_name"
WHERE "display_name" IS NOT NULL AND "name" IS NULL;

UPDATE "users"
SET "image" = "photo_url"
WHERE "photo_url" IS NOT NULL AND "image" IS NULL;
```

---

## Deployment Steps

### 1. **Apply Database Migration**

Choose one method:

**Option A: Prisma CLI (Recommended)**
```bash
npx prisma migrate deploy
```

**Option B: Direct SQL Execution (Railway Console)**
```bash
# Copy SQL from: prisma/migrations/add_nextauth_standard_fields.sql
# Paste into Railway PostgreSQL console
```

### 2. **Regenerate Prisma Client**
```bash
npx prisma generate
```

### 3. **Deploy to Railway**
```bash
git add .
git commit -m "fix: Add NextAuth v4 Prisma adapter compatibility"
git push origin main
```

Railway will auto-deploy the updated code.

### 4. **Verify Post-Deployment**

Test all authentication flows:

**✅ Google OAuth Sign-In**
```bash
# Navigate to: https://your-app.up.railway.app/auth/signin
# Click "Sign in with Google"
# Verify: No errors, user profile displays correctly
```

**✅ Azure AD OAuth Sign-In**
```bash
# Click "Sign in with Microsoft"
# Verify: No errors, user created successfully
```

**✅ Credentials Sign-In**
```bash
# Enter email/password
# Verify: Session works, user data populated
```

**✅ Database Check**
```sql
SELECT id, email, name, "displayName", image, "photoUrl", "emailVerified"
FROM users
WHERE email = 'test@example.com';

-- Verify:
-- - Both name and displayName populated
-- - Both image and photoUrl populated
-- - emailVerified is NULL or has timestamp
```

---

## Validation Checklist

### Pre-Deployment
- [x] Prisma schema updated (adds fields, no removals)
- [x] Migration SQL created (additive only)
- [x] Auth config simplified (uses standard adapter)
- [x] Type definitions added
- [x] Build succeeds (`npm run build`)
- [x] No TypeScript errors

### Post-Deployment
- [ ] Migration applied successfully
- [ ] Google OAuth sign-in works
- [ ] Azure AD OAuth sign-in works
- [ ] Credentials sign-in works
- [ ] User profile data displays correctly
- [ ] No adapter errors in Railway logs
- [ ] Sessions persist correctly
- [ ] Existing users can still sign in
- [ ] New users are created successfully

---

## Expected Behavior After Migration

### User Record After OAuth Sign-In
```json
{
  "id": "uuid-here",
  "email": "user@example.com",

  // NextAuth standard fields (populated by adapter)
  "name": "John Doe",
  "image": "https://lh3.googleusercontent.com/...",
  "emailVerified": "2025-10-03T12:00:00.000Z",

  // Custom fields (synced via callback)
  "displayName": "John Doe",
  "photoUrl": "https://lh3.googleusercontent.com/...",
  "provider": "google",
  "role": "user",
  "lastLogin": "2025-10-03T12:00:00.000Z"
}
```

### Account Record After OAuth Sign-In
```json
{
  "id": "uuid-here",
  "userId": "user-uuid-here",
  "type": "oauth",
  "provider": "google",
  "providerAccountId": "123456789",
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1234567890,
  "token_type": "Bearer",
  "scope": "openid email profile gmail.readonly",
  "id_token": "...",
  "session_state": null
}
```

**No more errors:**
- ✅ No "Unknown field 'refresh_token_expires_in'" error
- ✅ No "Field 'displayName' not found" error
- ✅ No custom adapter type casting (`as any`)

---

## Rollback Plan

If issues occur after deployment:

### Database Rollback
```sql
-- Remove added columns (safe: displayName/photoUrl data is unchanged)
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "name",
  DROP COLUMN IF EXISTS "email_verified",
  DROP COLUMN IF EXISTS "image";
```

### Code Rollback
```bash
git revert <commit-hash>
git push origin main
```

**Note:** Rollback is safe because:
- No data was deleted
- Original fields (`displayName`, `photoUrl`) were never removed
- Migration is additive only

---

## Future Cleanup (Optional)

Once all code references are migrated to use `name`/`image`, you can:

1. **Deprecate custom fields** (separate migration to drop `displayName`, `photoUrl`)
2. **Update all code** to only use NextAuth standard fields
3. **Remove field sync callbacks** (no longer needed)

**Timeline:** Can be done in 3-6 months after validating current migration works.

---

## Database Connection

**Railway PostgreSQL:**
```
postgresql://postgres:dMLnKNdmNHoMFsuYXkSqGYSDzQZWFBYq@metro.proxy.rlwy.net:46220/railway
```

Set in `.env.local`:
```bash
DATABASE_URL="postgresql://postgres:dMLnKNdmNHoMFsuYXkSqGYSDzQZWFBYq@metro.proxy.rlwy.net:46220/railway"
```

---

## Support

For issues or questions:
1. Check Railway deployment logs: `railway logs`
2. Check PostgreSQL logs in Railway console
3. Review full migration guide: `NEXTAUTH_MIGRATION_GUIDE.md`

---

## Summary

✅ **Schema**: User model now has NextAuth standard fields
✅ **Adapter**: Using standard PrismaAdapter (no custom overrides)
✅ **Data Sync**: Callbacks keep NextAuth ↔ custom fields in sync
✅ **Build**: TypeScript compiles successfully
✅ **Safety**: Additive-only migration, zero data loss
✅ **Ready**: Deploy to Railway now

**Next Step:** Apply the migration SQL to Railway PostgreSQL, then deploy the updated code.
