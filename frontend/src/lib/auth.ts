import { getServerSession as nextAuthGetServerSession } from 'next-auth/next'
import { authOptions } from './auth.config'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'

/**
 * Type-safe wrapper for getServerSession
 *
 * Returns the current user session from NextAuth.
 * Safe to use in Server Components and Server Actions.
 */
export async function getServerSession(): Promise<Session | null> {
  return await nextAuthGetServerSession(authOptions)
}

/**
 * Require authentication for Server Components/Actions
 *
 * Throws an error and redirects to sign-in if user is not authenticated.
 * Use this at the top of protected routes and server actions.
 *
 * @returns Authenticated session (guaranteed non-null)
 * @throws Redirects to /auth/signin if not authenticated
 *
 * @example
 * ```ts
 * export default async function ProtectedPage() {
 *   const session = await requireServerAuth()
 *   // session is guaranteed to be non-null here
 *   return <div>Welcome {session.user.email}</div>
 * }
 * ```
 */
export async function requireServerAuth(): Promise<Session> {
  const session = await getServerSession()

  if (!session || !session.user) {
    redirect('/auth/signin')
  }

  return session
}

/**
 * Get current user ID (convenience helper)
 *
 * Returns the authenticated user's ID or null if not authenticated.
 * Safe to use in Server Components and Server Actions.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession()
  return session?.user?.id ?? null
}

/**
 * Check if user is authenticated (convenience helper)
 *
 * Returns true if user has a valid session.
 * Safe to use in Server Components and Server Actions.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession()
  return !!session?.user
}

/**
 * Check if user is an admin
 *
 * Compares user email against ADMIN_EMAILS environment variable.
 * Returns false if not authenticated or not an admin.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession()
  if (!session?.user?.email) return false

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
  return adminEmails.includes(session.user.email)
}

/**
 * Require admin access
 *
 * Throws an error if user is not an admin.
 * Use this at the top of admin-only routes and server actions.
 *
 * @throws Redirects to /auth/signin if not authenticated
 * @throws Redirects to /unauthorized if not an admin
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireServerAuth()

  if (!(await isAdmin())) {
    redirect('/unauthorized')
  }

  return session
}
