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

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI,
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user email
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const emailAddress = profile.data.emailAddress

    // Store tokens securely in database using Prisma
    const account = await prisma.emailAccount.upsert({
      where: {
        userId_provider_email: {
          userId: userId,
          provider: 'gmail',
          email: emailAddress || '',
        },
      },
      create: {
        userId: userId,
        provider: 'gmail',
        email: emailAddress || '',
        accessToken: JSON.stringify(encrypt(tokens.access_token || '')),
        refreshToken: JSON.stringify(encrypt(tokens.refresh_token || '')),
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: 'gmail.readonly',
        isActive: true,
        lastSync: null,
        syncStatus: 'ready',
        errorMessage: null,
      },
      update: {
        accessToken: JSON.stringify(encrypt(tokens.access_token || '')),
        refreshToken: JSON.stringify(encrypt(tokens.refresh_token || '')),
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
        syncStatus: 'ready',
        errorMessage: null,
        updatedAt: new Date(),
      },
    })

    if (!account) {
      console.error('Error storing Gmail tokens')
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      return NextResponse.redirect(
        new URL('/integrations?error=Failed to store account', baseUrl)
      )
    }

    // Redirect back to integrations page with success message
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      new URL('/integrations?success=Gmail connected', baseUrl)
    )
  } catch (error) {
    console.error('Error handling Gmail callback:', error)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      new URL('/integrations?error=Failed to connect Gmail', baseUrl)
    )
  }
}
