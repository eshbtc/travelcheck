import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }

  const { user } = authResult

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 })
  }

  try {
    // Build Microsoft OAuth URL
    const clientId = process.env.OFFICE365_CLIENT_ID
    const redirectUri = process.env.OFFICE365_REDIRECT_URI
    const scopes = 'offline_access Mail.Read'
    const responseType = 'code'
    const state = user.id

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