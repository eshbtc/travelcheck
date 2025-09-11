import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { google } from 'googleapis'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
const ALGORITHM = 'aes-256-gcm'

function decrypt(encryptedData: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key not found')
  
  const [encrypted, iv, tag] = encryptedData.split(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
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
    // Get the user's Gmail OAuth tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { success: false, error: 'Gmail token not found' },
        { status: 404 }
      )
    }

    // Decrypt tokens
    const accessToken = decrypt(tokenData.encrypted_access_token)
    const refreshToken = tokenData.encrypted_refresh_token ? decrypt(tokenData.encrypted_refresh_token) : null

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    try {
      // Revoke the tokens with Google
      if (refreshToken) {
        await oauth2Client.revokeToken(refreshToken)
      } else {
        await oauth2Client.revokeToken(accessToken)
      }
    } catch (revokeError) {
      console.warn('Error revoking token with Google:', revokeError)
      // Continue with local cleanup even if Google revocation fails
    }

    // Remove tokens from database
    const { error: deleteError } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'gmail')

    if (deleteError) {
      console.error('Error deleting Gmail tokens:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to remove Gmail tokens' },
        { status: 500 }
      )
    }

    // Update user integration status
    const { error: integrationError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        provider: 'gmail',
        is_connected: false,
        disconnected_at: new Date().toISOString(),
        last_sync_at: null
      })

    if (integrationError) {
      console.error('Error updating integration status:', integrationError)
    }

    // Mark any pending sync jobs as cancelled
    await supabase
      .from('sync_jobs')
      .update({ 
        status: 'cancelled',
        error_message: 'Gmail access revoked by user',
        completed_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .in('status', ['pending', 'processing'])

    // Log the revocation
    await supabase
      .from('system_logs')
      .insert({
        user_id: user.id,
        operation: 'gmail_access_revoked',
        details: {
          timestamp: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || 'unknown'
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Gmail access has been successfully revoked',
      provider: 'gmail',
      revoked_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error revoking Gmail access:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke Gmail access' },
      { status: 500 }
    )
  }
}