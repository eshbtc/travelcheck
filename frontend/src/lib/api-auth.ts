import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import type { Session } from 'next-auth'

/**
 * Require authentication for API routes
 *
 * Checks for valid NextAuth session. Returns NextResponse with 401 error if not authenticated.
 *
 * @param request NextRequest (not used but kept for API compatibility)
 * @returns Session if authenticated, NextResponse with error if not
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const session = await requireAuth(request)
 *   if (session instanceof NextResponse) return session // Auth failed
 *
 *   // session is Session type here
 *   const userId = session.user.id
 *   ...
 * }
 * ```
 */
export async function requireAuth(request: NextRequest): Promise<Session | NextResponse> {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      )
    }

    return session
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    )
  }
}