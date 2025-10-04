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
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    // Get code and state from query parameters
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || state !== userId) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      return NextResponse.redirect(
        new URL('/integrations?error=Invalid authorization', baseUrl)
      )
    }

    // Exchange code for tokens
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
      console.error('Token exchange failed:', errorText)
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      return NextResponse.redirect(
        new URL('/integrations?error=Failed to exchange authorization code', baseUrl)
      )
    }

    const tokens = await tokenResponse.json()

    // Get user profile to get email address
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!profileResponse.ok) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      return NextResponse.redirect(
        new URL('/integrations?error=Failed to get user profile', baseUrl)
      )
    }

    const profile = await profileResponse.json()
    const emailAddress = profile.mail || profile.userPrincipalName

    // Store tokens securely in database using Prisma
    const account = await prisma.emailAccount.upsert({
      where: {
        userId_provider_email: {
          userId: userId,
          provider: 'office365',
          email: emailAddress || '',
        },
      },
      create: {
        userId: userId,
        provider: 'office365',
        email: emailAddress || '',
        accessToken: JSON.stringify(encrypt(tokens.access_token || '')),
        refreshToken: JSON.stringify(encrypt(tokens.refresh_token || '')),
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
        accessToken: JSON.stringify(encrypt(tokens.access_token || '')),
        refreshToken: JSON.stringify(encrypt(tokens.refresh_token || '')),
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        isActive: true,
        syncStatus: 'ready',
        errorMessage: null,
        updatedAt: new Date(),
      },
    })

    if (!account) {
      console.error('Error storing Office365 tokens')
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      return NextResponse.redirect(
        new URL('/integrations?error=Failed to store account', baseUrl)
      )
    }

    // Redirect back to integrations page with success message
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      new URL('/integrations?success=Office365 connected', baseUrl)
    )
  } catch (error) {
    console.error('Error handling Office365 callback:', error)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      new URL('/integrations?error=Failed to connect Office365', baseUrl)
    )
  }
}
