# Synthetic Health Checks

This document outlines the synthetic monitoring setup for availability SLOs and proactive incident detection.

## 🎯 Monitoring Objectives

**Availability SLO:** 99.5% uptime (approximately 3.6 hours downtime per month)
**Response Time SLO:** P95 < 2 seconds for API endpoints
**Error Rate SLO:** < 0.1% for critical user journeys

---

## 🔍 Synthetic Check Configuration

### 1. Basic Health Check
```bash
#!/bin/bash
# basic-health-check.sh
# Run every 1 minute from multiple locations

ENDPOINT="https://travelcheck.xyz/api/health"
TIMEOUT=10

response=$(curl -s -w "%{http_code},%{time_total}" -m $TIMEOUT "$ENDPOINT")
http_code=$(echo "$response" | tail -n1 | cut -d',' -f1)
time_total=$(echo "$response" | tail -n1 | cut -d',' -f2)

if [[ "$http_code" == "200" ]]; then
  echo "✅ Health check passed - ${time_total}s response time"
  exit 0
else
  echo "❌ Health check failed - HTTP $http_code"
  exit 1
fi
```

### 2. Analysis Endpoint Check
```bash
#!/bin/bash
# analysis-endpoint-check.sh  
# Run every 5 minutes with test data

ENDPOINT="https://travelcheck.xyz/api/travel/insights"
API_KEY="${SYNTHETIC_API_KEY}" # Service account for monitoring

# Test payload with minimal travel data
payload='{
  "entries": [
    {
      "country": "US",
      "entry_date": "2024-01-01",
      "exit_date": "2024-01-15",
      "purpose": "business"
    }
  ]
}'

response=$(curl -s -w "%{http_code},%{time_total}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "$payload" \
  -m 15 \
  "$ENDPOINT")

http_code=$(echo "$response" | tail -n1 | cut -d',' -f1)
time_total=$(echo "$response" | tail -n1 | cut -d',' -f2)

if [[ "$http_code" == "200" ]] && [[ $(echo "$time_total < 5.0" | bc) == 1 ]]; then
  echo "✅ Analysis endpoint healthy - ${time_total}s response time"
  exit 0
else
  echo "❌ Analysis endpoint unhealthy - HTTP $http_code, ${time_total}s"
  exit 1
fi
```

---

## 🌐 Multi-Region Monitoring

### Location Coverage
- **Primary:** US East (Virginia) - Main production region
- **Secondary:** US West (Oregon) - Backup region  
- **Tertiary:** EU West (Ireland) - International users

### Monitoring Services

#### Option 1: GitHub Actions (Free)
```yaml
# .github/workflows/synthetic-monitoring.yml
name: Synthetic Health Checks
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes

jobs:
  health-check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        region: [us-east-1, us-west-2, eu-west-1]
    steps:
      - uses: actions/checkout@v3
      
      - name: Basic Health Check
        run: |
          response=$(curl -s -w "%{http_code},%{time_total}" -m 10 \
            "https://travelcheck.xyz/api/health")
          
          http_code=$(echo "$response" | tail -n1 | cut -d',' -f1)
          time_total=$(echo "$response" | tail -n1 | cut -d',' -f2)
          
          if [[ "$http_code" != "200" ]]; then
            echo "::error::Health check failed from ${{ matrix.region }} - HTTP $http_code"
            exit 1
          fi
          
          echo "✅ Health check passed from ${{ matrix.region }} - ${time_total}s"
      
      - name: Analysis Endpoint Check
        if: matrix.region == 'us-east-1' # Only test from primary region
        run: |
          # Test with synthetic monitoring API key
          response=$(curl -s -w "%{http_code},%{time_total}" \
            -H "Authorization: Bearer ${{ secrets.SYNTHETIC_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"entries":[{"country":"US","entry_date":"2024-01-01","exit_date":"2024-01-15"}]}' \
            -m 15 \
            "https://travelcheck.xyz/api/travel/insights")
          
          http_code=$(echo "$response" | tail -n1 | cut -d',' -f1)
          
          if [[ "$http_code" != "200" ]]; then
            echo "::error::Analysis endpoint failed - HTTP $http_code"
            exit 1
          fi
          
          echo "✅ Analysis endpoint healthy"

      - name: Notify on Failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Synthetic check failed from ${{ matrix.region }}'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

#### Option 2: UptimeRobot (Paid Service)
```bash
# Setup via UptimeRobot API
# Monitor URLs:
# - https://travelcheck.xyz/api/health (1 min intervals)
# - https://travelcheck.xyz/ (5 min intervals)

curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "'"$UPTIMEROBOT_API_KEY"'",
    "format": "json",
    "type": 1,
    "url": "https://travelcheck.xyz/api/health",
    "friendly_name": "Travel Tracker API Health",
    "interval": 300,
    "timeout": 30
  }'
```

#### Option 3: DataDog Synthetics
```yaml
# datadog-synthetics.yaml
tests:
  - name: "Travel Tracker Health Check"
    type: api
    subtype: http
    config:
      request:
        method: GET
        url: "https://travelcheck.xyz/api/health"
        timeout: 30
      assertions:
        - type: statusCode
          operator: is
          target: 200
        - type: responseTime
          operator: lessThan
          target: 2000
    locations:
      - aws:us-east-1
      - aws:eu-west-1
    options:
      tick_every: 300 # 5 minutes
      
  - name: "Travel Analysis API"
    type: api
    subtype: http  
    config:
      request:
        method: POST
        url: "https://travelcheck.xyz/api/travel/insights"
        headers:
          Content-Type: application/json
          Authorization: "Bearer {{SYNTHETIC_API_KEY}}"
        body: |
          {
            "entries": [{
              "country": "US",
              "entry_date": "2024-01-01",
              "exit_date": "2024-01-15"
            }]
          }
      assertions:
        - type: statusCode
          operator: is
          target: 200
        - type: body
          operator: contains
          target: "patterns"
    locations:
      - aws:us-east-1
    options:
      tick_every: 900 # 15 minutes
```

---

## 🚨 Alert Configuration

### Slack Alerts
```typescript
// webhook-alerts.ts - For deployment or serverless function
export async function sendAlert(check: string, status: 'up' | 'down', details: any) {
  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) return
  
  const color = status === 'up' ? 'good' : 'danger'
  const emoji = status === 'up' ? '✅' : '🔴'
  
  const payload = {
    text: `${emoji} ${check} is ${status}`,
    attachments: [{
      color,
      fields: [
        { title: 'Service', value: check, short: true },
        { title: 'Status', value: status, short: true },
        { title: 'Response Time', value: `${details.responseTime}ms`, short: true },
        { title: 'Timestamp', value: new Date().toISOString(), short: true }
      ]
    }]
  }
  
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}
```

### Email Alerts (via SendGrid)
```typescript
export async function sendEmailAlert(incident: {
  service: string
  status: 'outage' | 'degraded' | 'recovered'
  duration?: string
  details: string
}) {
  const sg = require('@sendgrid/mail')
  sg.setApiKey(process.env.SENDGRID_API_KEY)
  
  const msg = {
    to: ['ops-team@company.com', 'on-call@company.com'],
    from: 'alerts@traveltracker.com',
    subject: `[${incident.status.toUpperCase()}] ${incident.service}`,
    html: `
      <h2>Service Alert: ${incident.service}</h2>
      <p><strong>Status:</strong> ${incident.status}</p>
      <p><strong>Duration:</strong> ${incident.duration || 'Ongoing'}</p>
      <p><strong>Details:</strong> ${incident.details}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <hr>
      <p><a href="https://travelcheck.xyz/api/health">Check Health</a> | 
         <a href="https://sentry.io/projects/travel-tracker/">View Errors</a></p>
    `
  }
  
  await sg.send(msg)
}
```

---

## 📊 SLO Dashboard

### Key Metrics to Track
```sql
-- Availability calculation (daily)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_checks,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_checks,
  ROUND(
    (SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 
    2
  ) as availability_percentage
FROM synthetic_check_results 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Response time percentiles
SELECT 
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time) as p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99,
  AVG(response_time) as average
FROM synthetic_check_results 
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND status = 'success';
```

### Grafana Dashboard Config
```json
{
  "dashboard": {
    "title": "Travel Tracker Synthetic Monitoring",
    "panels": [
      {
        "title": "Availability SLO",
        "type": "stat",
        "targets": [{
          "expr": "avg_over_time(synthetic_health_check_success[30d]) * 100",
          "legendFormat": "30-day availability"
        }],
        "thresholds": [
          {"color": "red", "value": 99.0},
          {"color": "yellow", "value": 99.5}, 
          {"color": "green", "value": 99.9}
        ]
      },
      {
        "title": "Response Times",
        "type": "graph",
        "targets": [{
          "expr": "histogram_quantile(0.95, synthetic_response_time_bucket)",
          "legendFormat": "95th percentile"
        }]
      }
    ]
  }
}
```

---

## 🔧 Implementation Steps

### 1. Create Synthetic API User
```sql
-- Create dedicated user for synthetic checks
INSERT INTO users (id, email, role) 
VALUES (
  gen_random_uuid(),
  'synthetic@traveltracker.com', 
  'synthetic'
);

-- Grant minimal required permissions
-- (Adjust based on your RLS policies)
```

### 2. Deploy Monitoring Scripts
```bash
# Option A: Deploy to serverless function
vercel --prod ./synthetic-checks/

# Option B: Use GitHub Actions (free)
git add .github/workflows/synthetic-monitoring.yml
git commit -m "Add synthetic monitoring"
git push

# Option C: Set up external monitoring service
# Configure UptimeRobot, Pingdom, or DataDog
```

### 3. Configure Alerts
```bash
# Set up Slack webhook
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# Set up email alerts  
export SENDGRID_API_KEY="SG...."

# Test alert system
curl -X POST "$SLACK_WEBHOOK_URL" \
  -d '{"text":"🧪 Testing synthetic monitoring alerts"}'
```

---

## 🎛️ Monitoring Runbook

### When Synthetic Check Fails

**Immediate Actions (< 5 minutes):**
1. Check if it's a false positive:
   ```bash
   curl -I https://travelcheck.xyz/api/health
   ```
2. Verify from multiple locations
3. Check Sentry for related errors
4. Review recent deployments

**Investigation (5-15 minutes):**
1. Check server logs and metrics
2. Verify database connectivity  
3. Test critical user journeys manually
4. Check third-party service status

**Escalation Criteria:**
- Multiple regions failing
- Analysis endpoint non-responsive
- User reports of issues
- Error rate > 1% for 5+ minutes

### Synthetic Check Maintenance

**Weekly:**
- Review false positive rate (target < 2%)
- Verify alert routing works
- Check synthetic API user quota

**Monthly:**  
- Review SLO performance vs targets
- Update synthetic test scenarios
- Rotate synthetic API credentials
- Test disaster recovery procedures

---

*This synthetic monitoring setup provides early warning for outages and helps maintain availability SLOs through proactive monitoring.*