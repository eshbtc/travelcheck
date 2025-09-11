import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

// Helper function to check if user is admin
async function requireAdmin(user: any) {
  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !userData || userData.role !== 'admin') {
    return false
  }
  return true
}

export async function GET(request: NextRequest) {
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
    // Check if user is admin
    const isAdmin = await requireAdmin(user)
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, display_name, role, created_at, last_login, settings')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      users: users,
    })
  } catch (error) {
    console.error('Error listing users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list users' },
      { status: 500 }
    )
  }
}