import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function authenticateUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header', status: 401 }
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { error: 'Invalid or expired token', status: 401 }
    }

    return { user, error: null }
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Authentication failed', 
      status: 500 
    }
  }
}

export async function requireAuth(request: NextRequest) {
  const authResult = await authenticateUser(request)
  if (authResult.error) {
    return authResult
  }
  return authResult
}