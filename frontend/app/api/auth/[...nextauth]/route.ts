import NextAuth from 'next-auth'
import { authOptions } from '../../../../src/lib/auth.config'

/**
 * NextAuth API Route Handler
 *
 * Handles all authentication endpoints:
 * - GET/POST /api/auth/signin - Sign in page and provider redirect
 * - GET/POST /api/auth/signout - Sign out
 * - GET /api/auth/callback/:provider - OAuth callback
 * - GET /api/auth/session - Get current session
 * - GET /api/auth/providers - List available providers
 * - GET/POST /api/auth/csrf - CSRF token
 *
 * This is a catch-all route that handles all NextAuth.js requests.
 */
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
