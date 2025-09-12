# API Incident Response Runbook

This document provides step-by-step procedures for handling API incidents, outages, and emergencies.

## 🚨 Emergency Contacts

- **On-Call Engineer:** [Your contact info]
- **Supabase Support:** [Enterprise support if available]
- **Sentry Alerts:** Check #alerts channel

## 📊 Monitoring & Detection

### Health Check Endpoint
```bash
# Basic health check
curl -f https://your-domain.com/api/health

# Expected response
{"success": true, "status": "healthy"}
```

### Key Metrics to Monitor
- **API Response Times:** 95th percentile < 2 seconds
- **Error Rates:** < 1% for critical endpoints
- **Database Connections:** < 80% of pool
- **Memory Usage:** < 85%
- **Rate Limit Hits:** Track 429 responses

### Sentry Alerts
- **High Error Rate:** > 10 errors/minute
- **Database Timeouts:** Query time > 5 seconds
- **Authentication Failures:** > 50 failures/hour

---

## 🔧 Common Incident Responses

### 1. API Completely Down (5xx Errors)

**Symptoms:**
- All API endpoints returning 500/502/503
- Health check failing
- No database connectivity

**Immediate Actions:**
```bash
# 1. Check service status
curl -I https://your-domain.com/api/health

# 2. Check Supabase status
curl -I https://your-project-id.supabase.co/rest/v1/

# 3. Check recent deployments
git log --oneline -10

# 4. Review error logs
# Sentry dashboard or server logs
```

**Resolution Steps:**
1. **Rollback if recent deploy:**
   ```bash
   # If deployed via Vercel/Netlify
   git revert HEAD
   git push origin main
   
   # Wait for redeploy and test
   curl https://your-domain.com/api/health
   ```

2. **Database connectivity issues:**
   ```bash
   # Check Supabase dashboard
   # Verify connection strings in env
   # Check if connection pool exhausted
   ```

3. **Resource exhaustion:**
   ```bash
   # Check memory/CPU usage
   # Restart application if needed
   # Scale up resources
   ```

### 2. Authentication/Authorization Failures

**Symptoms:**
- All requests returning 401/403
- "User not found" errors
- JWT validation failures

**Resolution Steps:**
```bash
# 1. Test auth endpoint directly
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# 2. Check Supabase Auth settings
# - JWT secret rotation
# - Auth providers status
# - User table permissions

# 3. Check environment variables
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - JWT secrets
```

**Common Fixes:**
- Restart application after env var changes
- Clear JWT token cache if implemented
- Check Supabase Auth dashboard for outages

### 3. Database Performance Issues

**Symptoms:**
- Slow API responses (>5 seconds)
- Database timeout errors
- High connection count

**Diagnosis:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, state, query_start, now() - query_start AS runtime
FROM pg_stat_activity 
WHERE now() - query_start > interval '5 seconds';

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**Resolution:**
1. **Kill long-running queries:**
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE now() - query_start > interval '10 minutes';
   ```

2. **Scale database resources (if available)**
3. **Enable connection pooling**
4. **Add missing indexes:**
   ```sql
   -- Common missing indexes
   CREATE INDEX IF NOT EXISTS idx_travel_entries_user_date 
   ON travel_entries(user_id, entry_date);
   
   CREATE INDEX IF NOT EXISTS idx_passport_scans_user_created 
   ON passport_scans(user_id, created_at);
   ```

### 4. Rate Limiting Issues

**Symptoms:**
- Users reporting 429 errors
- Legitimate traffic being blocked
- OAuth sync failures

**Resolution:**
```bash
# 1. Check current rate limits
curl -v https://your-domain.com/api/gmail/sync \
  -H "Authorization: Bearer TOKEN"
# Look for X-RateLimit-* headers

# 2. Temporarily increase limits (emergency)
# Edit src/lib/rateLimiter.ts
# Redeploy quickly

# 3. Check for abuse
# Review rate limit logs
# Look for unusual patterns
```

### 5. OAuth Integration Failures

**Symptoms:**
- Gmail/Office365 sync returning errors
- "Invalid credentials" messages
- Token refresh failures

**Diagnosis:**
```bash
# 1. Check OAuth provider status
# Google: https://status.cloud.google.com/
# Microsoft: https://status.office.com/

# 2. Test token validity
# Check encrypted tokens in database
# Verify ENCRYPTION_KEY hasn't changed

# 3. Check OAuth app configuration
# Redirect URIs, scopes, client secrets
```

**Resolution:**
1. **Token refresh issues:**
   ```sql
   -- Force token refresh for affected users
   UPDATE email_accounts 
   SET needs_reauth = true 
   WHERE provider = 'gmail' AND error_count > 5;
   ```

2. **OAuth app misconfiguration:**
   - Verify client IDs/secrets
   - Check redirect URIs
   - Ensure scopes are correct

---

## 🗂️ Schema Rollback Procedures

### Rolling Back Database Migrations

**⚠️ DANGER:** Always test rollbacks in staging first!

```sql
-- 1. Check current migration state
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 5;

-- 2. Create backup before rollback
-- Use Supabase dashboard or pg_dump

-- 3. Rollback specific migration (example)
-- This depends on your migration tool
-- Supabase CLI: supabase db reset --linked
-- Custom: Run reverse migration SQL

-- 4. Verify rollback
SELECT count(*) FROM information_schema.tables 
WHERE table_name = 'rolled_back_table_name';
```

### Application Code Rollback

```bash
# 1. Identify last known good commit
git log --oneline -20

# 2. Create rollback commit
git revert <bad-commit-hash>

# 3. Deploy immediately
git push origin main

# 4. Monitor health check
watch -n 10 'curl -s https://your-domain.com/api/health | jq'
```

---

## 🔇 Disabling Features

### Disable Email Sync (Emergency)

```typescript
// Add to environment or feature flag
DISABLE_EMAIL_SYNC=true

// Or update rate limiter to reject all requests
export async function rateLimitEmailSync(req: any) {
  return {
    success: false,
    error: 'Email sync temporarily disabled for maintenance',
    retryAfter: 3600 // 1 hour
  }
}
```

### Disable AI Features

```bash
# Set environment variable
DISABLE_AI_ANALYSIS=true

# Or return early in AI routes
export async function POST(request: NextRequest) {
  if (process.env.DISABLE_AI_ANALYSIS === 'true') {
    return NextResponse.json({
      success: false,
      error: 'AI analysis temporarily unavailable'
    }, { status: 503 })
  }
  // ... normal processing
}
```

---

## 📈 Scaling Procedures

### Vertical Scaling (More Resources)

**Supabase:**
- Upgrade database tier in dashboard
- Increase connection limits
- Add read replicas if available

**Application:**
- Increase memory/CPU limits
- Scale serverless function timeout
- Add CDN caching

### Horizontal Scaling (Load Distribution)

```bash
# Add database connection pooling
npm install @supabase/supabase-js pgbouncer

# Configure connection pooling
DATABASE_URL="postgresql://postgres:password@host:6543/postgres"
```

---

## 🔍 Enhanced Logging

### Temporary Debug Logging

```typescript
// Add to API routes during incidents
console.log('DEBUG: Request details:', {
  timestamp: new Date().toISOString(),
  method: request.method,
  url: request.url,
  userAgent: request.headers.get('user-agent'),
  userId: user?.id
})
```

### Log Analysis

```bash
# Search logs for patterns
grep "ERROR" logs/*.log | head -20
grep "Database timeout" logs/*.log | wc -l
grep "401" logs/api.log | tail -10
```

---

## 📱 Communication Templates

### Status Page Update

```
🔴 INVESTIGATING: We're currently experiencing issues with our API endpoints. 
Users may see slow response times or errors when accessing travel data.
Our team is actively investigating.

🟡 UPDATE: We've identified the root cause as database performance issues. 
Implementing fix now. ETA: 15 minutes.

🟢 RESOLVED: All systems operational. Response times back to normal. 
Post-mortem will be published within 24 hours.
```

### User Email Template

```
Subject: Service Disruption - Travel History Tracker

We experienced a service disruption today between [TIME] and [TIME] that 
may have affected your ability to access travel data.

The issue was caused by [ROOT CAUSE] and has been fully resolved.

Your data remains secure and no information was lost.

We apologize for any inconvenience.

- Travel Tracker Team
```

---

## 🎯 Post-Incident Actions

### Immediate (Within 2 hours)
- [ ] Verify full service restoration
- [ ] Document timeline and actions taken
- [ ] Check for any data corruption
- [ ] Update monitoring/alerting if gaps found

### Short-term (Within 24 hours)
- [ ] Write post-mortem report
- [ ] Implement immediate preventive measures
- [ ] Review response time and improve procedures
- [ ] Communicate with affected users

### Long-term (Within 1 week)
- [ ] Implement permanent fixes
- [ ] Update documentation
- [ ] Review and improve monitoring
- [ ] Conduct team retrospective

---

## 📞 Escalation Matrix

| Severity | Response Time | Who to Contact |
|----------|---------------|----------------|
| **Critical** (Service down) | 5 minutes | On-call engineer + Team lead |
| **High** (Degraded performance) | 15 minutes | On-call engineer |
| **Medium** (Minor issues) | 1 hour | During business hours |
| **Low** (Cosmetic issues) | Next business day | Regular support |

---

## ✅ Incident Checklist

### During Incident
- [ ] Acknowledge alert within SLA
- [ ] Post initial status update
- [ ] Start incident timeline document
- [ ] Gather relevant team members
- [ ] Implement immediate fixes
- [ ] Monitor metrics for improvement
- [ ] Post resolution update

### After Incident  
- [ ] Verify all systems healthy
- [ ] Document lessons learned
- [ ] Update runbooks
- [ ] Schedule post-mortem meeting
- [ ] Implement preventive measures
- [ ] Update monitoring/alerts

---

*This runbook should be reviewed and updated quarterly. Last updated: September 12, 2024*