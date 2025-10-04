import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'
import crypto from 'crypto'

// Simple AES encryption for tokens
function getKey() {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('Server misconfiguration: ENCRYPTION_KEY is not set')
  }
  return crypto.createHash('sha256').update(raw).digest()
}

function encrypt(text: string) {
  const iv = crypto.randomBytes(12)
  const key = getKey()
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    iv: iv.toString('base64'),
    data: enc.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export async function GET(request: NextRequest) {
  console.log('[Office365 Callback] Starting OAuth callback flow')

  const session = await requireAuth(request)
  if (session instanceof NextResponse) {
    console.log('[Office365 Callback] Auth failed - no valid session')
    return session
  }

  const userId = session.user.id
  console.log('[Office365 Callback] Authenticated user:', userId)

  // Get base URL for redirects
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  console.log('[Office365 Callback] Base URL for redirects:', baseUrl)

  try {
    // Get code and state from query parameters
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    console.log('[Office365 Callback] Received code:', code ? 'present' : 'missing')
    console.log('[Office365 Callback] Received state:', state)
    console.log('[Office365 Callback] Expected state (userId):', userId)

    // Validate state parameter
    if (!code) {
      console.error('[Office365 Callback] Missing authorization code')
      return NextResponse.redirect(
        new URL('/integrations?error=missing_code&details=No authorization code received', baseUrl)
      )
    }

    if (state !== userId) {
      console.error('[Office365 Callback] State mismatch - expected:', userId, 'received:', state)
      return NextResponse.redirect(
        new URL('/integrations?error=state_mismatch&details=Invalid state parameter', baseUrl)
      )
    }

    console.log('[Office365 Callback] State validation passed')

    // Test database connection first
    try {
      const dbTest = await prisma.$queryRaw`SELECT 1 as result`
      console.log('[Office365 Callback] Database connection test successful:', dbTest)
    } catch (dbError) {
      console.error('[Office365 Callback] Database connection test failed:', dbError)
      return NextResponse.redirect(
        new URL('/integrations?error=database_connection&details=Cannot connect to database', baseUrl)
      )
    }

    // Exchange code for tokens
    console.log('[Office365 Callback] Exchanging authorization code for tokens')
    console.log('[Office365 Callback] Redirect URI used:', process.env.OFFICE365_REDIRECT_URI)

    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    const tokenParams = new URLSearchParams({
      client_id: process.env.OFFICE365_CLIENT_ID!,
      client_secret: process.env.OFFICE365_CLIENT_SECRET!,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.OFFICE365_REDIRECT_URI!,
      scope: 'offline_access Mail.Read',
    })

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[Office365 Callback] Token exchange failed with status:', tokenResponse.status)
      console.error('[Office365 Callback] Token exchange error response:', errorText)
      return NextResponse.redirect(
        new URL(`/integrations?error=token_exchange&details=${encodeURIComponent(errorText || 'Failed to exchange authorization code')}`, baseUrl)
      )
    }

    const tokens = await tokenResponse.json()
    console.log('[Office365 Callback] Token exchange successful')
    console.log('[Office365 Callback] Has access_token:', !!tokens.access_token)
    console.log('[Office365 Callback] Has refresh_token:', !!tokens.refresh_token)
    console.log('[Office365 Callback] Expires in:', tokens.expires_in, 'seconds')

    // Get user profile to get email address
    console.log('[Office365 Callback] Fetching user profile from Microsoft Graph API')
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      console.error('[Office365 Callback] Profile fetch failed with status:', profileResponse.status)
      console.error('[Office365 Callback] Profile fetch error response:', errorText)
      return NextResponse.redirect(
        new URL(`/integrations?error=profile_fetch&details=${encodeURIComponent(errorText || 'Failed to get user profile')}`, baseUrl)
      )
    }

    const profile = await profileResponse.json()
    const emailAddress = profile.mail || profile.userPrincipalName
    console.log('[Office365 Callback] User profile fetched successfully, email:', emailAddress)

    if (!emailAddress) {
      console.error('[Office365 Callback] No email address in profile response')
      console.error('[Office365 Callback] Profile data:', JSON.stringify(profile, null, 2))
      return NextResponse.redirect(
        new URL('/integrations?error=no_email&details=Profile missing email address', baseUrl)
      )
    }

    // Encrypt tokens
    console.log('[Office365 Callback] Encrypting tokens')
    let encryptedAccessToken, encryptedRefreshToken
    try {
      encryptedAccessToken = JSON.stringify(encrypt(tokens.access_token || ''))
      encryptedRefreshToken = JSON.stringify(encrypt(tokens.refresh_token || ''))
      console.log('[Office365 Callback] Tokens encrypted successfully')
    } catch (encryptError: any) {
      console.error('[Office365 Callback] Token encryption failed:', encryptError)
      return NextResponse.redirect(
        new URL(`/integrations?error=encryption_failed&details=${encodeURIComponent(encryptError.message || 'Encryption failed')}`, baseUrl)
      )
    }

    // Store tokens securely in database using Prisma
    console.log('[Office365 Callback] Attempting database upsert for userId:', userId, 'email:', emailAddress)
    let account
    try {
      account = await prisma.emailAccount.upsert({
        where: {
          userId_provider_email: {
            userId: userId,
            provider: 'office365',
            email: emailAddress,
          },
        },
        create: {
          userId: userId,
          provider: 'office365',
          email: emailAddress,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
          scope: 'Mail.Read',
          isActive: true,
          lastSync: null,
          syncStatus: 'ready',
          errorMessage: null,
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
          isActive: true,
          syncStatus: 'ready',
          errorMessage: null,
          updatedAt: new Date(),
        },
      })
      console.log('[Office365 Callback] Database upsert successful, account ID:', account.id)
    } catch (dbError: any) {
      console.error('[Office365 Callback] Database upsert failed:', dbError)
      console.error('[Office365 Callback] Database error name:', dbError.name)
      console.error('[Office365 Callback] Database error message:', dbError.message)
      console.error('[Office365 Callback] Database error code:', dbError.code)
      return NextResponse.redirect(
        new URL(`/integrations?error=database_upsert&details=${encodeURIComponent(dbError.message || 'Failed to store account')}`, baseUrl)
      )
    }

    if (!account) {
      console.error('[Office365 Callback] Upsert returned null/undefined')
      return NextResponse.redirect(
        new URL('/integrations?error=upsert_null&details=Database upsert returned no result', baseUrl)
      )
    }

    // Redirect back to integrations page with success message
    console.log('[Office365 Callback] OAuth flow completed successfully, redirecting with success')
    return NextResponse.redirect(
      new URL(`/integrations?success=office365_connected&email=${encodeURIComponent(emailAddress)}`, baseUrl)
    )
  } catch (error: any) {
    console.error('[Office365 Callback] Unexpected error in callback flow:', error)
    console.error('[Office365 Callback] Error name:', error.name)
    console.error('[Office365 Callback] Error message:', error.message)
    console.error('[Office365 Callback] Error stack:', error.stack)
    return NextResponse.redirect(
      new URL(`/integrations?error=unexpected&details=${encodeURIComponent(error.message || 'Unknown error occurred')}`, baseUrl)
    )
  }
}
