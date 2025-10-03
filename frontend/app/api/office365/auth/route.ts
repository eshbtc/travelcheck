import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    // Build Microsoft OAuth URL
    const clientId = process.env.OFFICE365_CLIENT_ID
    const redirectUri = process.env.OFFICE365_REDIRECT_URI
    const scopes = 'offline_access Mail.Read'
    const responseType = 'code'
    const state = userId

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(clientId!)}&` +
      `response_type=${responseType}&` +
      `redirect_uri=${encodeURIComponent(redirectUri!)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${encodeURIComponent(state)}&` +
      `prompt=consent`

    return NextResponse.json({
      success: true,
      authUrl,
    })
  } catch (error) {
    console.error('Error generating Office365 auth URL:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}