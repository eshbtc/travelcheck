import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth'

/**
 * Authenticate user from NextAuth session
 *
 * Checks for valid NextAuth session in cookies.
 * Returns user data if authenticated, error otherwise.
 */
export async function authenticateUser(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return { error: 'Unauthorized - No valid session', status: 401 }
    }

    // Return user in same format as before for backward compatibility
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      },
      error: null
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Authentication failed',
      status: 500
    }
  }
}

/**
 * Require authentication for API routes
 *
 * Wrapper around authenticateUser for consistent error handling.
 * Returns same result structure as authenticateUser.
 */
export async function requireAuth(request: NextRequest) {
  const authResult = await authenticateUser(request)
  if (authResult.error) {
    return authResult
  }
  return authResult
}