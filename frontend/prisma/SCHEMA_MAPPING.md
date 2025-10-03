# Prisma Schema Mapping - Travel Check

## Overview
This document describes the complete Prisma schema conversion from Supabase SQL to Prisma format for the Railway migration.

**Total Models**: 26 (22 core models + 4 NextAuth models)
**Database**: PostgreSQL
**Schema Status**: Validated and Generated

---

## Model Summary

### Core User & Auth Models (2)
- `User` - Core user model extending auth.users
- `UserPreference` - User preferences and settings

### NextAuth Models (3)
- `Account` - OAuth account connections
- `Session` - User sessions
- `VerificationToken` - Email verification tokens

### Email & Flight Models (2)
- `EmailAccount` - OAuth email integrations (Gmail, Office365)
- `FlightEmail` - Parsed flight emails and booking confirmations

### Travel & Passport Models (4)
- `TravelHistory` - Aggregated user travel record
- `PassportScan` - Uploaded passport scans with OCR
- `TravelEntry` - Individual travel records (stamps, flights, manual)
- `Report` - Generated travel reports
- `ReportTemplate` - Custom report templates

### Duplicate Detection Models (3)
- `DuplicateGroup` - Grouped duplicate items
- `DuplicateItem` - Individual items in duplicate groups
- `DuplicateDetectionResult` - Detection run results

### Batch Processing Models (2)
- `BatchOperation` - Batch processing tracking
- `BatchJob` - Scheduled batch jobs

### System & Monitoring Models (2)
- `SystemLog` - Operational logging
- `HealthCheck` - System health status

### AI Models (2)
- `AiCache` - LLM response caching
- `AiUsageLog` - AI endpoint usage tracking

### Billing Models (4)
- `BillingCustomer` - Customer billing info
- `BillingSubscription` - Subscription tracking
- `BillingEntitlement` - Plan entitlements
- `BillingWebhookEvent` - Webhook event log

---

## Field Naming Conventions

### SQL to Prisma Mapping Rules
All SQL snake_case column names are mapped to Prisma camelCase using `@map()`:

```prisma
// SQL: display_name → Prisma: displayName
displayName String? @map("display_name")

// SQL: created_at → Prisma: createdAt
createdAt DateTime @default(now()) @map("created_at")

// SQL: is_verified → Prisma: isVerified
isVerified Boolean @default(false) @map("is_verified")
```

### Table Mapping
All table names use `@@map()` to maintain SQL naming:

```prisma
model EmailAccount {
  // fields...
  @@map("email_accounts")
}
```

---

## Type Conversions

| SQL Type | Prisma Type | Notes |
|----------|-------------|-------|
| `UUID` | `String @db.Uuid` | All IDs use UUID |
| `TIMESTAMPTZ` | `DateTime` | Timezone-aware timestamps |
| `JSONB` | `Json` | JSON columns |
| `DECIMAL` | `Decimal @db.Decimal` | Precise decimals |
| `TEXT[]` | `String[]` | String arrays |
| `BOOLEAN` | `Boolean` | Boolean flags |
| `INTEGER` | `Int` | Integer numbers |
| `TEXT` | `String` | Text fields |
| `DATE` | `DateTime @db.Date` | Date only |
| `TIME` | `DateTime @db.Time` | Time only |

---

## Relationships

### User Model (Central Hub)
The User model has the most relationships, connecting to all user-specific data:

```prisma
model User {
  // One-to-one
  preferences         UserPreference?
  travelHistory       TravelHistory?
  billingCustomer     BillingCustomer?
  billingEntitlement  BillingEntitlement?

  // One-to-many
  emailAccounts       EmailAccount[]
  flightEmails        FlightEmail[]
  passportScans       PassportScan[]
  travelEntries       TravelEntry[]
  reports             Report[]
  reportTemplates     ReportTemplate[]
  duplicateGroups     DuplicateGroup[]
  batchOperations     BatchOperation[]
  aiCache             AiCache[]
  // ... and more
}
```

### Cascade Delete Rules
All user-owned data uses `onDelete: Cascade`:

```prisma
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

### Set Null Rules
Optional relationships use `onDelete: SetNull`:

```prisma
emailAccount EmailAccount? @relation(fields: [emailAccountId], references: [id], onDelete: SetNull)
```

---

## Indexes

### Performance Indexes
All high-traffic query patterns have indexes:

```prisma
// User lookups
@@index([userId])

// Status filtering
@@index([status])

// Date range queries
@@index([entryDate])

// Composite indexes
@@index([userId, provider, isActive])
@@index([userId, createdAt])
```

### Unique Constraints

```prisma
// Single field unique
@unique
email String @unique

// Composite unique
@@unique([userId, provider, email])
@@unique([emailAccountId, messageId], name: "flight_emails_account_message_unique")
```

---

## Special Patterns

### Self-Referencing (Passport Scans)
PassportScan has self-referencing duplicate tracking:

```prisma
model PassportScan {
  duplicateOf     String?       @map("duplicate_of") @db.Uuid
  duplicateOfScan PassportScan? @relation("DuplicateScans", fields: [duplicateOf], references: [id])
  duplicateScans  PassportScan[] @relation("DuplicateScans")
}
```

### Multi-Relation (DuplicateGroup)
DuplicateGroup has two relations to User:

```prisma
model DuplicateGroup {
  userId     String @map("user_id") @db.Uuid
  resolvedBy String? @map("resolved_by") @db.Uuid

  user     User  @relation(fields: [userId], references: [id])
  resolver User? @relation("ResolvedBy", fields: [resolvedBy], references: [id])
}
```

### Sorted Indexes
BillingWebhookEvent has descending sort on receivedAt:

```prisma
@@index([receivedAt(sort: Desc)])
```

---

## NextAuth Integration

The schema includes all required NextAuth Prisma adapter models:

### Account Model
Stores OAuth provider accounts:
- Links user to OAuth providers (Google, GitHub, etc.)
- Stores access/refresh tokens
- Unique constraint on `[provider, providerAccountId]`

### Session Model
Manages user sessions:
- Session tokens for authentication
- Expiration tracking
- Links to User model

### VerificationToken Model
Email verification and password reset:
- Unique tokens
- Expiration tracking
- Composite unique on `[identifier, token]`

---

## Default Values

### Common Defaults
```prisma
// JSON fields
settings    Json @default("{}")
metadata    Json @default("{}")
attachments Json @default("[]")

// Status fields
status String @default("pending")
role   String @default("user")

// Boolean flags
isActive   Boolean @default(true)
isVerified Boolean @default(false)

// Timestamps
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

---

## Validation Checklist

- [x] All 26 models defined
- [x] All relationships configured
- [x] All indexes included
- [x] All unique constraints added
- [x] All field mappings correct
- [x] NextAuth models integrated
- [x] Schema validated (`npx prisma validate`)
- [x] Client generated (`npx prisma generate`)
- [x] All cascade rules defined
- [x] All default values set

---

## Usage Examples

### Creating a User
```typescript
const user = await prisma.user.create({
  data: {
    id: userId,
    email: 'user@example.com',
    displayName: 'John Doe',
    preferences: {
      create: {
        preferences: {}
      }
    }
  },
  include: {
    preferences: true
  }
})
```

### Querying with Relations
```typescript
const userWithData = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    emailAccounts: true,
    passportScans: {
      where: { processingStatus: 'completed' }
    },
    travelEntries: {
      orderBy: { entryDate: 'desc' }
    }
  }
})
```

### Upsert Pattern
```typescript
const emailAccount = await prisma.emailAccount.upsert({
  where: {
    userId_provider_email: {
      userId,
      provider: 'gmail',
      email: 'user@gmail.com'
    }
  },
  create: {
    userId,
    provider: 'gmail',
    email: 'user@gmail.com',
    accessToken: token
  },
  update: {
    accessToken: token,
    lastSync: new Date()
  }
})
```

---

## Migration Notes

### From Supabase to Prisma

1. **Foreign Keys**: All Supabase foreign keys are mapped to Prisma relations
2. **RLS Policies**: RLS is still active in PostgreSQL, Prisma works alongside it
3. **Triggers**: Database triggers (updated_at) still function normally
4. **Extensions**: UUID and pgcrypto extensions remain in place
5. **Storage**: Supabase Storage RLS policies are separate from Prisma

### Next Steps

1. **Database Migration**: Run `npx prisma db push` or `npx prisma migrate dev` to sync schema
2. **Seed Data**: Create seed script if needed
3. **Test Queries**: Validate all API routes work with Prisma
4. **Type Safety**: Update all imports to use Prisma types
5. **Error Handling**: Implement Prisma error handling

---

## File Locations

- **Schema**: `/frontend/prisma/schema.prisma`
- **Generated Client**: `/frontend/node_modules/@prisma/client`
- **Migrations**: `/frontend/prisma/migrations/` (if using migrations)
- **SQL Schema**: `/supabase/migrations/20250912120000_consolidated_baseline.sql`

---

**Schema Version**: 1.0.0
**Generated**: 2025-10-02
**Database**: PostgreSQL via Railway
**Status**: Production Ready
