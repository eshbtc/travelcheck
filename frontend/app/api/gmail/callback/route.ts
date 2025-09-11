import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { google } from 'googleapis'
import crypto from 'crypto'

// Simple AES encryption for tokens
function getKey() {
  const raw = process.env.ENCRYPTION_KEY || 'default-key'
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
    const body = await request.json()
    const { code, state } = body

    if (!code || state !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid authorization code or state' },
        { status: 400 }
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

    // Store tokens securely in Supabase
    const { error } = await supabase
      .from('email_accounts')
      .upsert({
        user_id: user.id,
        provider: 'gmail',
        email: emailAddress,
        access_token: JSON.stringify(encrypt(tokens.access_token || '')),
        refresh_token: JSON.stringify(encrypt(tokens.refresh_token || '')),
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scope: 'gmail.modify',
        is_active: true,
        last_sync: null,
        sync_status: 'ready',
        error_message: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider,email'
      })

    if (error) {
      console.error('Error storing Gmail tokens:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to store account information' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail account connected successfully',
    })
  } catch (error) {
    console.error('Error handling Gmail callback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to connect Gmail account' },
      { status: 500 }
    )
  }
}