import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../auth/middleware'
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
    // Check if user is admin
    const isAdmin = await requireAdmin(user)
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { targetUserId, role } = body

    if (!targetUserId || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing targetUserId or role' },
        { status: 400 }
      )
    }

    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be admin or user' },
        { status: 400 }
      )
    }

    // Update user role
    const { data, error } = await supabase
      .from('users')
      .update({ 
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId)
      .select()

    if (error) {
      console.error('Error updating user role:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update user role' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      user: data[0],
    })
  } catch (error) {
    console.error('Error setting user role:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to set user role' },
      { status: 500 }
    )
  }
}