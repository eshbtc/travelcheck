# Secrets Rotation Schedule & Documentation

This document outlines the secrets rotation schedule, procedures, and hygiene practices for the Travel History Tracker application.

## 🔐 Secrets Inventory

### High-Priority Secrets (Rotate Quarterly)
| Secret | Location | Purpose | Rotation Frequency |
|--------|----------|---------|-------------------|
| `ENCRYPTION_KEY` | Env/CI | OAuth token encryption | Every 3 months |
| `SUPABASE_SERVICE_ROLE_KEY` | Env/CI | Database admin access | Every 3 months |
| `GMAIL_CLIENT_SECRET` | Env/CI | Gmail OAuth | Every 6 months |
| `OFFICE365_CLIENT_SECRET` | Env/CI | Office365 OAuth | Every 6 months |

### Medium-Priority Secrets (Rotate Semi-Annually)
| Secret | Location | Purpose | Rotation Frequency |
|--------|----------|---------|-------------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Env/CI | Frontend Supabase access | Every 6 months |
| `SENTRY_DSN` | Env/CI | Error monitoring | Every 12 months |
| `SENTRY_AUTH_TOKEN` | CI only | Source map uploads | Every 12 months |

### Application Keys (Rotate as Needed)
| Secret | Location | Purpose | Rotation Frequency |
|--------|----------|---------|-------------------|
| JWT secrets | Supabase | User authentication | As needed |
| API rate limit keys | Internal | Rate limiting | As needed |

---

## 🗓️ Rotation Schedule

### Quarterly (Every 3 Months)
- **When:** 1st week of Jan, Apr, Jul, Oct
- **Secrets:** ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY
- **Lead Time:** 2 weeks notice to team
- **Maintenance Window:** Non-peak hours (2-4 AM UTC)

### Semi-Annual (Every 6 Months)
- **When:** 1st week of Jan, Jul  
- **Secrets:** OAuth client secrets, Supabase anon key
- **Lead Time:** 1 month notice for OAuth provider changes
- **Coordination:** Requires OAuth provider console access

### Annual (Yearly)
- **When:** January maintenance window
- **Secrets:** Sentry keys, monitoring tokens
- **Review:** Full security audit and secrets inventory

---

## 🔄 Rotation Procedures

### 1. ENCRYPTION_KEY Rotation

**⚠️ CRITICAL:** This requires careful coordination to avoid breaking existing OAuth tokens.

**Preparation (2 weeks before):**
```bash
# 1. Generate new key
openssl rand -hex 32

# 2. Test key in staging environment
# 3. Prepare rollback plan
```

**Rotation Day:**
1. **Deploy dual-key support** (old + new keys):
   ```typescript
   // Temporary: Support both keys during transition
   const OLD_KEY = process.env.ENCRYPTION_KEY_OLD
   const NEW_KEY = process.env.ENCRYPTION_KEY_NEW
   
   function decryptWithFallback(encrypted: string) {
     try {
       return decrypt(encrypted, NEW_KEY)
     } catch {
       return decrypt(encrypted, OLD_KEY) // Fallback
     }
   }
   ```

2. **Update environment variables**:
   ```bash
   # Production
   ENCRYPTION_KEY_NEW=new_generated_key_here
   ENCRYPTION_KEY_OLD=current_key_here
   
   # CI/CD
   # Update GitHub Secrets, Vercel env vars, etc.
   ```

3. **Deploy and monitor**:
   - Deploy with dual-key support
   - Monitor error rates for 24 hours
   - Verify OAuth flows still work

4. **Re-encrypt all tokens** (background job):
   ```sql
   -- Update all OAuth tokens with new encryption
   UPDATE email_accounts 
   SET 
     access_token = encrypt_with_new_key(decrypt_with_old_key(access_token)),
     refresh_token = encrypt_with_new_key(decrypt_with_old_key(refresh_token))
   WHERE provider IN ('gmail', 'office365');
   ```

5. **Remove old key** (1 week later):
   - Remove `ENCRYPTION_KEY_OLD` from all environments
   - Update code to use single key only

**Rollback Plan:**
- Keep old key for 1 week minimum
- Monitor Sentry for decryption errors
- If issues: revert environment variables immediately

---

### 2. Supabase Service Role Key Rotation

**Preparation:**
```bash
# 1. Generate new service role key in Supabase dashboard
# 2. Test API access with new key in staging
```

**Rotation:**
1. **Update environment variables** in all systems:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=new_service_key_here
   ```

2. **Deploy simultaneously** to all environments
3. **Test critical functions**:
   ```bash
   # Test API endpoints
   curl -H "Authorization: Bearer $NEW_KEY" \
     "$SUPABASE_URL/rest/v1/users?limit=1"
   
   # Test database operations
   npm run test:integration
   ```

4. **Revoke old key** in Supabase dashboard after 24h

---

### 3. OAuth Client Secrets Rotation

**Google OAuth (Gmail):**
1. **Google Cloud Console**:
   - Navigate to APIs & Credentials
   - Generate new client secret
   - Keep old secret active initially

2. **Update environment variables**:
   ```bash
   GMAIL_CLIENT_SECRET=new_google_secret_here
   ```

3. **Deploy and test OAuth flow**:
   ```bash
   # Test Gmail integration
   curl -X POST /api/gmail/auth
   # Complete OAuth flow in browser
   ```

4. **Revoke old secret** after 48h testing period

**Microsoft OAuth (Office365):**
1. **Azure App Registration**:
   - Navigate to Certificates & secrets
   - Add new client secret
   - Note expiration date (max 2 years)

2. **Update and deploy** following same pattern as Gmail

---

### 4. Emergency Rotation

**Immediate Response (Compromise Detected):**
1. **Revoke compromised secret** immediately in provider console
2. **Generate new secret** and deploy ASAP
3. **Monitor systems** for failures and user impact
4. **Document incident** for post-mortem

**Communication:**
```
SECURITY ALERT: Emergency secret rotation in progress
- Affected service: [service name]
- Impact: [brief user impact]
- ETA: [estimated fix time]
- Status updates: Every 30 minutes
```

---

## 🛠️ Automation Tools

### Secret Scanner
```bash
# Check for secrets in code (pre-commit hook)
git secrets --scan

# Check for leaked secrets in history
truffleHog --repo-path . --entropy
```

### Rotation Reminders
```yaml
# .github/workflows/secrets-reminder.yml
name: Secrets Rotation Reminder
on:
  schedule:
    - cron: '0 9 1 1,4,7,10 *' # Quarterly reminder
jobs:
  remind:
    runs-on: ubuntu-latest
    steps:
      - name: Create Issue
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Quarterly Secrets Rotation Due',
              body: 'Time to rotate ENCRYPTION_KEY and SUPABASE_SERVICE_ROLE_KEY'
            })
```

### Health Checks
```typescript
// Monitor for secret-related failures
export async function checkSecretHealth(): Promise<{success: boolean, errors: string[]}> {
  const errors: string[] = []
  
  // Test database connection
  try {
    await supabase.from('users').select('count').limit(1)
  } catch (error) {
    errors.push('Supabase connection failed - check service role key')
  }
  
  // Test OAuth token decryption
  try {
    const { data } = await supabase.from('email_accounts').select('refresh_token').limit(1)
    if (data?.[0]?.refresh_token) {
      decrypt(data[0].refresh_token) // Test decryption
    }
  } catch (error) {
    errors.push('OAuth token decryption failed - check encryption key')
  }
  
  return { success: errors.length === 0, errors }
}
```

---

## 📋 Pre-Rotation Checklist

**2 Weeks Before:**
- [ ] Schedule maintenance window
- [ ] Notify team of upcoming rotation
- [ ] Test rotation procedure in staging
- [ ] Prepare rollback plans
- [ ] Update documentation if procedures changed

**Day Before:**
- [ ] Confirm maintenance window
- [ ] Verify staging tests pass
- [ ] Prepare monitoring dashboards
- [ ] Brief on-call engineer

**Day Of:**
- [ ] Execute rotation during maintenance window
- [ ] Monitor error rates and system health
- [ ] Test critical user flows
- [ ] Document any issues encountered

**Post-Rotation:**
- [ ] Monitor for 48 hours
- [ ] Revoke old secrets
- [ ] Update next rotation date in calendar
- [ ] Update this documentation with lessons learned

---

## 🚨 Incident Response

**If Rotation Breaks Production:**
1. **Immediate rollback** to old secrets
2. **Restore service** and verify functionality  
3. **Investigate root cause** in staging
4. **Re-attempt rotation** with fixes applied
5. **Document lessons learned**

**Emergency Contacts:**
- On-call engineer: [Phone/Slack]
- Security team: [Email]  
- OAuth provider support: [Links to support]

---

## 📝 Audit Log

| Date | Secret Rotated | Rotated By | Issues | Notes |
|------|---------------|------------|---------|--------|
| 2024-01-15 | ENCRYPTION_KEY | DevOps Team | None | Smooth rotation |
| 2024-01-15 | SUPABASE_SERVICE_ROLE_KEY | DevOps Team | 5min downtime | Deployment delay |
| | | | | |

---

*This document should be reviewed and updated after each rotation to capture lessons learned and improve procedures.*