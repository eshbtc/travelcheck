import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { Client } from '@microsoft/microsoft-graph-client'
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
    // Get the user's Office365 OAuth tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'office365')
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { success: false, error: 'Office365 token not found' },
        { status: 404 }
      )
    }

    // Decrypt tokens
    const accessToken = decrypt(tokenData.access_token)
    const refreshToken = tokenData.refresh_token ? decrypt(tokenData.refresh_token) : null

    try {
      // Revoke token with Microsoft
      const revokeUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/logout'
      const revokeParams = new URLSearchParams({
        post_logout_redirect_uri: process.env.OFFICE365_REDIRECT_URI || 'http://localhost:3000/auth/oauth-callback/office365',
      })

      // For refresh token revocation, use different endpoint
      if (refreshToken) {
        const tokenRevokeUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/revoke'
        const tokenRevokeParams = new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || '',
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
          token: refreshToken,
          token_type_hint: 'refresh_token'
        })

        await fetch(tokenRevokeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenRevokeParams.toString()
        })
      }

    } catch (revokeError) {
      console.warn('Error revoking token with Microsoft:', revokeError)
      // Continue with local cleanup even if Microsoft revocation fails
    }

    // Remove tokens from database (or mark as inactive)
    const { error: deleteError } = await supabase
      .from('email_accounts')
      .update({
        access_token: null,
        refresh_token: null,
        is_active: false
      })
      .eq('user_id', user.id)
      .eq('provider', 'office365')

    if (deleteError) {
      console.error('Error deleting Office365 tokens:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to remove Office365 tokens' },
        { status: 500 }
      )
    }

    // Update user integration status
    const { error: integrationError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        provider: 'office365',
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
        error_message: 'Office365 access revoked by user',
        completed_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('provider', 'office365')
      .in('status', ['pending', 'processing'])

    // Log the revocation
    await supabase
      .from('system_logs')
      .insert({
        user_id: user.id,
        operation: 'office365_access_revoked',
        details: {
          timestamp: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || 'unknown'
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Office365 access has been successfully revoked',
      provider: 'office365',
      revoked_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error revoking Office365 access:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke Office365 access' },
      { status: 500 }
    )
  }
}