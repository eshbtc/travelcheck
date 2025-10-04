import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'

export async function POST(request: NextRequest) {
  console.log('[Office365 Auth] Starting OAuth authorization flow')

  const session = await requireAuth(request)
  if (session instanceof NextResponse) {
    console.log('[Office365 Auth] Auth failed - no valid session')
    return session
  }

  const userId = session.user.id
  console.log('[Office365 Auth] Authenticated user:', userId)

  try {
    // Log environment configuration (without exposing secrets)
    console.log('[Office365 Auth] OFFICE365_CLIENT_ID configured:', !!process.env.OFFICE365_CLIENT_ID)
    console.log('[Office365 Auth] OFFICE365_CLIENT_SECRET configured:', !!process.env.OFFICE365_CLIENT_SECRET)
    console.log('[Office365 Auth] OFFICE365_REDIRECT_URI:', process.env.OFFICE365_REDIRECT_URI)

    // Build Microsoft OAuth URL using environment variables directly
    const clientId = process.env.OFFICE365_CLIENT_ID
    const redirectUri = process.env.OFFICE365_REDIRECT_URI // Use environment variable directly
    const scopes = 'offline_access Mail.Read'
    const responseType = 'code'
    const state = userId // Use user ID as state for CSRF protection

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(clientId!)}&` +
      `response_type=${responseType}&` +
      `redirect_uri=${encodeURIComponent(redirectUri!)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${encodeURIComponent(state)}&` +
      `prompt=consent`

    console.log('[Office365 Auth] Auth URL generated successfully')
    console.log('[Office365 Auth] State parameter (userId):', userId)

    return NextResponse.json({
      success: true,
      authUrl,
    })
  } catch (error: any) {
    console.error('[Office365 Auth] Error generating Office365 auth URL:', error)
    console.error('[Office365 Auth] Error name:', error.name)
    console.error('[Office365 Auth] Error message:', error.message)
    return NextResponse.json(
      { success: false, error: 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}