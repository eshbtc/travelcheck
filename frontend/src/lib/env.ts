import { z } from 'zod'

/**
 * Environment variable validation schema
 *
 * This schema validates all required and optional environment variables at runtime.
 * It ensures critical security configurations are present before the application starts.
 */
const envSchema = z.object({
  // Railway Database Configuration (Required)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required for database connection'),

  // NextAuth Configuration (Required)
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters for security'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters for security'),

  // OAuth Providers - Google (Required for Google OAuth)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // OAuth Providers - Azure AD (Required for Azure AD OAuth)
  AZURE_AD_CLIENT_ID: z.string().optional(),
  AZURE_AD_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_TENANT_ID: z.string().optional(),

  // Cloudflare R2 Storage Configuration (Required)
  R2_ACCOUNT_ID: z.string().min(1, 'R2_ACCOUNT_ID is required for storage'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required for storage'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required for storage'),
  R2_BUCKET_NAME: z.string().min(1, 'R2_BUCKET_NAME is required for storage'),
  R2_PUBLIC_URL: z.string().url('R2_PUBLIC_URL must be a valid URL').optional(),

  // Application Configuration
  NEXT_PUBLIC_APP_NAME: z.string().optional().default('Travel History Tracker'),
  NEXT_PUBLIC_ADMIN_EMAILS: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),

  // Document AI Configuration (Optional)
  DOCUMENT_AI_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_DOCUMENT_AI_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  DOCUMENT_AI_LOCATION: z.string().optional(),
  GOOGLE_CLOUD_DOCUMENT_AI_LOCATION: z.string().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().optional(),
  DOCUMENT_AI_PROCESSOR_ID: z.string().optional(),
  GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID: z.string().optional(),
  GOOGLE_CLOUD_DOCUMENT_AI_PASSPORT_PROCESSOR_ID: z.string().optional(),

  // Google Cloud Service Account (Optional)
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // AI Services (Optional)
  GOOGLE_AI_API_KEY: z.string().optional(),

  // CRON Job Authorization (Optional but recommended for production)
  CRON_SECRET: z.string().optional(),

  // Deployment (Optional)
  VERCEL_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
})

/**
 * Validated environment variables
 *
 * This export provides type-safe access to environment variables.
 * If validation fails, the application will throw an error at startup.
 */
export const env = (() => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      throw new Error('Invalid environment configuration. Please check the errors above.')
    }
    throw error
  }
})()

/**
 * Type-safe environment variables
 */
export type Env = z.infer<typeof envSchema>
