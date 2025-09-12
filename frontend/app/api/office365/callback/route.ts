import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
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
      return NextResponse.json(
        { success: false, error: 'Failed to exchange authorization code' },
        { status: 400 }
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
      return NextResponse.json(
        { success: false, error: 'Failed to get user profile' },
        { status: 400 }
      )
    }

    const profile = await profileResponse.json()
    const emailAddress = profile.mail || profile.userPrincipalName

    // Store tokens securely in Supabase
    const { error } = await supabase
      .from('email_accounts')
      .upsert({
        user_id: user.id,
        provider: 'office365',
        email: emailAddress,
        access_token: JSON.stringify(encrypt(tokens.access_token || '')),
        refresh_token: JSON.stringify(encrypt(tokens.refresh_token || '')),
        token_expires_at: tokens.expires_in ? 
          new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        scope: 'Mail.Read',
        is_active: true,
        last_sync: null,
        sync_status: 'ready',
        error_message: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider,email'
      })

    if (error) {
      console.error('Error storing Office365 tokens:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to store account information' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Office365 account connected successfully',
    })
  } catch (error) {
    console.error('Error handling Office365 callback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to connect Office365 account' },
      { status: 500 }
    )
  }
}
