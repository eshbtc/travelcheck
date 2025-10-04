import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  console.log('[Gmail Auth] Starting OAuth authorization flow')

  const session = await requireAuth(request)
  if (session instanceof NextResponse) {
    console.log('[Gmail Auth] Auth failed - no valid session')
    return session
  }

  const userId = session.user.id
  console.log('[Gmail Auth] Authenticated user:', userId)

  try {
    // Log environment configuration (without exposing secrets)
    console.log('[Gmail Auth] GMAIL_CLIENT_ID configured:', !!process.env.GMAIL_CLIENT_ID)
    console.log('[Gmail Auth] GMAIL_CLIENT_SECRET configured:', !!process.env.GMAIL_CLIENT_SECRET)
    console.log('[Gmail Auth] GMAIL_REDIRECT_URI:', process.env.GMAIL_REDIRECT_URI)

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI, // Use environment variable directly
    )

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
    ]

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: userId, // Use user ID as state for CSRF protection
    })

    console.log('[Gmail Auth] Auth URL generated successfully')
    console.log('[Gmail Auth] State parameter (userId):', userId)

    return NextResponse.json({
      success: true,
      authUrl,
    })
  } catch (error: any) {
    console.error('[Gmail Auth] Error generating Gmail auth URL:', error)
    console.error('[Gmail Auth] Error name:', error.name)
    console.error('[Gmail Auth] Error message:', error.message)
    return NextResponse.json(
      { success: false, error: 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}