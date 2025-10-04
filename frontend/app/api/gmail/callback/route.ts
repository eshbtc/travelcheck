import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'
import { google } from 'googleapis'
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
  console.log('[Gmail Callback] Starting OAuth callback flow')

  const session = await requireAuth(request)
  if (session instanceof NextResponse) {
    console.log('[Gmail Callback] Auth failed - no valid session')
    return session
  }

  const userId = session.user.id
  console.log('[Gmail Callback] Authenticated user:', userId)

  // Get base URL for redirects
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  console.log('[Gmail Callback] Base URL for redirects:', baseUrl)

  try {
    // Get code and state from query parameters
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    console.log('[Gmail Callback] Received code:', code ? 'present' : 'missing')
    console.log('[Gmail Callback] Received state:', state)
    console.log('[Gmail Callback] Expected state (userId):', userId)

    // Validate state parameter
    if (!code) {
      console.error('[Gmail Callback] Missing authorization code')
      return NextResponse.redirect(
        new URL('/integrations?error=missing_code&details=No authorization code received', baseUrl)
      )
    }

    if (state !== userId) {
      console.error('[Gmail Callback] State mismatch - expected:', userId, 'received:', state)
      return NextResponse.redirect(
        new URL('/integrations?error=state_mismatch&details=Invalid state parameter', baseUrl)
      )
    }

    console.log('[Gmail Callback] State validation passed')

    // Test database connection first
    try {
      const dbTest = await prisma.$queryRaw`SELECT 1 as result`
      console.log('[Gmail Callback] Database connection test successful:', dbTest)
    } catch (dbError) {
      console.error('[Gmail Callback] Database connection test failed:', dbError)
      return NextResponse.redirect(
        new URL('/integrations?error=database_connection&details=Cannot connect to database', baseUrl)
      )
    }

    // Initialize OAuth client
    console.log('[Gmail Callback] Initializing OAuth2 client with redirect URI:', process.env.GMAIL_REDIRECT_URI)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI,
    )

    // Exchange code for tokens
    console.log('[Gmail Callback] Exchanging authorization code for tokens')
    let tokens
    try {
      const tokenResponse = await oauth2Client.getToken(code)
      tokens = tokenResponse.tokens
      console.log('[Gmail Callback] Token exchange successful')
      console.log('[Gmail Callback] Has access_token:', !!tokens.access_token)
      console.log('[Gmail Callback] Has refresh_token:', !!tokens.refresh_token)
      console.log('[Gmail Callback] Token expiry:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none')
    } catch (tokenError: any) {
      console.error('[Gmail Callback] Token exchange failed:', tokenError)
      console.error('[Gmail Callback] Token error details:', tokenError.message)
      return NextResponse.redirect(
        new URL(`/integrations?error=token_exchange&details=${encodeURIComponent(tokenError.message || 'Token exchange failed')}`, baseUrl)
      )
    }

    oauth2Client.setCredentials(tokens)

    // Get user email from Gmail API
    console.log('[Gmail Callback] Fetching user profile from Gmail API')
    let emailAddress
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      const profile = await gmail.users.getProfile({ userId: 'me' })
      emailAddress = profile.data.emailAddress
      console.log('[Gmail Callback] User profile fetched successfully, email:', emailAddress)
    } catch (profileError: any) {
      console.error('[Gmail Callback] Profile fetch failed:', profileError)
      console.error('[Gmail Callback] Profile error details:', profileError.message)
      return NextResponse.redirect(
        new URL(`/integrations?error=profile_fetch&details=${encodeURIComponent(profileError.message || 'Failed to fetch profile')}`, baseUrl)
      )
    }

    if (!emailAddress) {
      console.error('[Gmail Callback] No email address in profile response')
      return NextResponse.redirect(
        new URL('/integrations?error=no_email&details=Profile missing email address', baseUrl)
      )
    }

    // Encrypt tokens
    console.log('[Gmail Callback] Encrypting tokens')
    let encryptedAccessToken, encryptedRefreshToken
    try {
      encryptedAccessToken = JSON.stringify(encrypt(tokens.access_token || ''))
      encryptedRefreshToken = JSON.stringify(encrypt(tokens.refresh_token || ''))
      console.log('[Gmail Callback] Tokens encrypted successfully')
    } catch (encryptError: any) {
      console.error('[Gmail Callback] Token encryption failed:', encryptError)
      return NextResponse.redirect(
        new URL(`/integrations?error=encryption_failed&details=${encodeURIComponent(encryptError.message || 'Encryption failed')}`, baseUrl)
      )
    }

    // Store tokens securely in database using Prisma
    console.log('[Gmail Callback] Attempting database upsert for userId:', userId, 'email:', emailAddress)
    let account
    try {
      account = await prisma.emailAccount.upsert({
        where: {
          userId_provider_email: {
            userId: userId,
            provider: 'gmail',
            email: emailAddress,
          },
        },
        create: {
          userId: userId,
          provider: 'gmail',
          email: emailAddress,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: 'gmail.readonly',
          isActive: true,
          lastSync: null,
          syncStatus: 'ready',
          errorMessage: null,
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          isActive: true,
          syncStatus: 'ready',
          errorMessage: null,
          updatedAt: new Date(),
        },
      })
      console.log('[Gmail Callback] Database upsert successful, account ID:', account.id)
    } catch (dbError: any) {
      console.error('[Gmail Callback] Database upsert failed:', dbError)
      console.error('[Gmail Callback] Database error name:', dbError.name)
      console.error('[Gmail Callback] Database error message:', dbError.message)
      console.error('[Gmail Callback] Database error code:', dbError.code)
      return NextResponse.redirect(
        new URL(`/integrations?error=database_upsert&details=${encodeURIComponent(dbError.message || 'Failed to store account')}`, baseUrl)
      )
    }

    if (!account) {
      console.error('[Gmail Callback] Upsert returned null/undefined')
      return NextResponse.redirect(
        new URL('/integrations?error=upsert_null&details=Database upsert returned no result', baseUrl)
      )
    }

    // Redirect back to integrations page with success message
    console.log('[Gmail Callback] OAuth flow completed successfully, redirecting with success')
    return NextResponse.redirect(
      new URL(`/integrations?success=gmail_connected&email=${encodeURIComponent(emailAddress)}`, baseUrl)
    )
  } catch (error: any) {
    console.error('[Gmail Callback] Unexpected error in callback flow:', error)
    console.error('[Gmail Callback] Error name:', error.name)
    console.error('[Gmail Callback] Error message:', error.message)
    console.error('[Gmail Callback] Error stack:', error.stack)
    return NextResponse.redirect(
      new URL(`/integrations?error=unexpected&details=${encodeURIComponent(error.message || 'Unknown error occurred')}`, baseUrl)
    )
  }
}
