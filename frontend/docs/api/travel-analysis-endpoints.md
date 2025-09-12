# Travel Analysis API Endpoints

This document describes the comprehensive travel analysis API endpoints that provide country rules, multi-purpose analysis, insights, and scenario simulation.

## Authentication

All endpoints require authentication via Bearer token:

```
Authorization: Bearer <your-access-token>
```

## Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/countries/rules` | GET/POST | Get country-specific compliance rules |
| `/api/travel/analyze-multi-purpose` | POST | Analyze compliance against multiple rules |
| `/api/travel/insights` | POST | Generate travel insights and recommendations |  
| `/api/travel/simulate` | POST | Simulate what-if scenarios |

---

## 1. Countries Rules API

### GET `/api/countries/rules`

Get compliance rules for a specific country.

**Query Parameters:**
- `country` (required): 2-3 letter country code (e.g., "US", "GB", "DE")

**Example Request:**
```bash
GET /api/countries/rules?country=US
Authorization: Bearer <token>
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "us-tax-residency-183",
      "name": "US Tax Residency - Substantial Presence Test",
      "description": "Must be physically present in the US for at least 183 days using the weighted formula: current year days + (1/3 × prior year days) + (1/6 × two years ago days)",
      "category": "tax_residency",
      "requirements": {
        "daysCurrentYear": { "min": 31, "description": "Must be present at least 31 days in current year" },
        "totalWeightedDays": { "min": 183, "description": "Weighted total must be at least 183 days" },
        "exemptions": ["diplomat", "teacher", "student", "professional_athlete"]
      },
      "effectiveFrom": "2024-01-01"
    }
  ],
  "meta": {
    "country": "US",
    "totalRules": 2,
    "categories": ["tax_residency", "visa_compliance"]
  }
}
```

### POST `/api/countries/rules`

Get rules for multiple countries in bulk.

**Request Body:**
```json
{
  "countries": ["US", "GB", "DE"]
}
```

---

## 2. Multi-Purpose Analysis API

### POST `/api/travel/analyze-multi-purpose`

Analyze travel compliance against multiple rules simultaneously.

**Request Body:**
```json
{
  "purposes": [
    {
      "category": "tax_residency",
      "country": "US", 
      "ruleId": "us-tax-residency-183"
    },
    {
      "category": "visa_compliance",
      "country": "DE",
      "ruleId": "de-schengen-duration"
    }
  ],
  "options": {
    "userTimezone": "America/New_York",
    "includeWhatIf": true,
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "purpose": "tax_residency",
      "country": "US",
      "ruleId": "us-tax-residency-183", 
      "status": "not_met",
      "result": {
        "currentYearDays": 145,
        "weightedTotal": 167.5,
        "meetsMinimumDays": true,
        "meetsWeightedTest": false,
        "breakdown": {
          "currentYear": 145,
          "priorYear": "45 ÷ 3 = 15.0",
          "twoYearsAgo": "45 ÷ 6 = 7.5"
        }
      },
      "recommendations": [
        "Track days carefully to avoid crossing threshold",
        "Consider timing of future travel"
      ]
    }
  ],
  "summary": {
    "totalPurposes": 2,
    "statusBreakdown": {
      "met": 0,
      "not_met": 1,
      "partial": 1,
      "error": 0
    },
    "criticalIssues": 1
  }
}
```

**Status Values:**
- `met` - Rule requirements are satisfied
- `not_met` - Rule requirements are not satisfied  
- `partial` - Some requirements met, additional factors needed
- `error` - Analysis could not be completed

---

## 3. Travel Insights API

### POST `/api/travel/insights`

Generate intelligent insights and recommendations based on travel patterns.

**Request Body:**
```json
{
  "timeRange": {
    "start": "2023-01-01",
    "end": "2024-12-31"
  },
  "countries": ["US", "GB"], 
  "includeRecommendations": true,
  "includeOpportunities": true,
  "includeWarnings": true
}
```

**Example Response:**
```json
{
  "success": true,
  "insights": [
    {
      "type": "warning",
      "title": "US Tax Residency Alert", 
      "description": "You've spent 156 days in the US this year. Monitor the substantial presence test carefully.",
      "priority": "high",
      "action": "Calculate weighted days using the substantial presence test formula"
    },
    {
      "type": "opportunity",
      "title": "Tax Planning Opportunity",
      "description": "With current travel patterns, you can optimize presence for favorable tax treatment.",
      "priority": "medium", 
      "action": "Consider professional tax advice for multi-jurisdiction planning"
    }
  ],
  "recommendations": [
    {
      "category": "compliance",
      "title": "Address Critical Compliance Issues",
      "description": "You have high-priority compliance alerts that require immediate attention.",
      "impact": "Avoid potential tax or immigration violations",
      "effort": "medium"
    }
  ],
  "travelPatterns": {
    "mostVisitedCountries": [
      { "country": "US", "visits": 8 },
      { "country": "GB", "visits": 3 }
    ],
    "seasonalDistribution": {
      "Spring": 4,
      "Summer": 6,
      "Fall": 2,
      "Winter": 1
    }
  }
}
```

**Insight Types:**
- `warning` - Critical issues requiring attention
- `opportunity` - Optimization possibilities  
- `info` - General information about patterns
- `recommendation` - Specific action items

---

## 4. Scenario Simulation API

### POST `/api/travel/simulate`

Simulate what-if scenarios to understand compliance impact of potential travel changes.

**Request Body:**
```json
{
  "name": "Extended Europe Summer Trip",
  "description": "Simulate impact of 6-week European trip",
  "changes": [
    {
      "type": "add_travel",
      "data": {
        "country_code": "DE",
        "entry_date": "2024-07-01",
        "exit_date": "2024-08-15",
        "purpose": "vacation"
      }
    },
    {
      "type": "remove_travel", 
      "data": {
        "id": "existing-trip-id"
      }
    }
  ],
  "purposes": [
    {
      "category": "tax_residency",
      "country": "US",
      "ruleId": "us-tax-residency-183"
    }
  ]
}
```

**Example Response:**
```json
{
  "success": true,
  "scenarioId": "scenario_1703123456789_abc123def",
  "results": [
    {
      "purpose": "tax_residency",
      "country": "US", 
      "ruleId": "us-tax-residency-183",
      "before": {
        "status": "not_met",
        "result": {
          "weightedTotal": 167.5,
          "meetsWeightedTest": false
        }
      },
      "after": {
        "status": "not_met", 
        "result": {
          "weightedTotal": 167.5,
          "meetsWeightedTest": false
        }
      },
      "impact": "No change - remains non-compliant"
    }
  ],
  "summary": {
    "changesApplied": 2,
    "entriesAdded": 1,
    "entriesRemoved": 1,
    "statusChanges": {
      "improved": 0,
      "worsened": 0, 
      "unchanged": 1
    }
  }
}
```

**Change Types:**
- `add_travel` - Add hypothetical travel entry
- `remove_travel` - Remove existing travel entry
- `modify_travel` - Modify existing travel entry

---

## Error Responses

All endpoints return structured error responses:

```json
{
  "success": false,
  "error": "Validation failed: Country code is required"
}
```

**Common HTTP Status Codes:**
- `400` - Invalid request data
- `401` - Authentication required
- `403` - Insufficient permissions
- `404` - Resource not found
- `500` - Internal server error

---

## Rate Limits

- **Analysis endpoints**: 60 requests per minute
- **Simulation endpoint**: 30 requests per minute  
- **Rules endpoint**: 120 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

---

## Data Models

### Travel Entry
```typescript
interface TravelEntry {
  id: string
  user_id: string
  country_code: string
  country_name?: string
  entry_date: string // YYYY-MM-DD
  exit_date?: string // YYYY-MM-DD
  purpose?: string
  transport_type?: string
  created_at: string
  updated_at: string
}
```

### Rule Definition
```typescript
interface Rule {
  id: string
  name: string
  description: string
  category: 'tax_residency' | 'visa_compliance' | 'immigration'
  requirements: Record<string, any>
  effectiveFrom: string
  effectiveTo?: string
}
```

---

## Implementation Notes

### US Substantial Presence Test
The weighted calculation follows IRS guidelines:
- Current year: Full days count
- Prior year: Days ÷ 3
- Two years ago: Days ÷ 6
- Minimum 31 days in current year required

### Schengen 90/180 Rule
- 90 days maximum in any 180-day period
- Uses sliding window calculation
- Applies to all Schengen area countries collectively

### UK Statutory Residence Test
- 183+ days = automatic resident
- Below 183 days = sufficient ties test applies
- Ties include: UK home, work, family, accommodation

---

## Testing

Use the provided test cases for boundary testing:

```bash
# Test US SPT exactly at threshold
POST /api/travel/analyze-multi-purpose
# With travel totaling exactly 183 weighted days

# Test Schengen at 90 day limit  
POST /api/travel/simulate
# With changes that result in exactly 90 days in 180-day window

# Test UK SRT ties requirements
POST /api/travel/insights
# With various day counts to verify ties thresholds
```