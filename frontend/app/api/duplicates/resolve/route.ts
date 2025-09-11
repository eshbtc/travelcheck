import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

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
    const { groupId, action, primaryItemId, itemsToDelete } = body

    if (!groupId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: groupId, action' },
        { status: 400 }
      )
    }

    // Verify group belongs to user
    const { data: group, error: groupError } = await supabase
      .from('duplicate_groups')
      .select('*')
      .eq('id', groupId)
      .eq('user_id', user.id)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { success: false, error: 'Duplicate group not found or access denied' },
        { status: 404 }
      )
    }

    let resolutionAction = ''
    let result: any = {}

    switch (action) {
      case 'merge':
        if (!primaryItemId) {
          return NextResponse.json(
            { success: false, error: 'Primary item ID required for merge action' },
            { status: 400 }
          )
        }

        // Get all items in the group
        const { data: items, error: itemsError } = await supabase
          .from('duplicate_items')
          .select('*')
          .eq('group_id', groupId)

        if (itemsError || !items) {
          return NextResponse.json(
            { success: false, error: 'Failed to fetch duplicate items' },
            { status: 500 }
          )
        }

        // Update primary item designation
        await supabase
          .from('duplicate_items')
          .update({ is_primary: false })
          .eq('group_id', groupId)

        await supabase
          .from('duplicate_items')
          .update({ is_primary: true })
          .eq('group_id', groupId)
          .eq('item_id', primaryItemId)

        // Mark non-primary travel entries as merged/ignored
        const nonPrimaryItems = items.filter(item => item.item_id !== primaryItemId)
        for (const item of nonPrimaryItems) {
          await supabase
            .from('travel_entries')
            .update({ status: 'ignored', notes: `Merged into entry ${primaryItemId}` })
            .eq('id', item.item_id)
        }

        resolutionAction = 'merged'
        result = { primaryItemId, mergedItems: nonPrimaryItems.length }
        break

      case 'delete':
        if (!itemsToDelete || itemsToDelete.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Items to delete required for delete action' },
            { status: 400 }
          )
        }

        // Delete travel entries
        const { error: deleteError } = await supabase
          .from('travel_entries')
          .delete()
          .in('id', itemsToDelete)
          .eq('user_id', user.id) // Additional security check

        if (deleteError) {
          return NextResponse.json(
            { success: false, error: 'Failed to delete travel entries' },
            { status: 500 }
          )
        }

        // Remove corresponding duplicate items
        await supabase
          .from('duplicate_items')
          .delete()
          .eq('group_id', groupId)
          .in('item_id', itemsToDelete)

        resolutionAction = 'deleted'
        result = { deletedItems: itemsToDelete.length }
        break

      case 'ignore':
        resolutionAction = 'ignored'
        result = { message: 'Marked as not duplicates' }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Must be merge, delete, or ignore' },
          { status: 400 }
        )
    }

    // Update duplicate group status
    const { error: updateError } = await supabase
      .from('duplicate_groups')
      .update({
        status: 'resolved',
        resolution_action: resolutionAction,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        metadata: {
          ...group.metadata,
          resolutionDetails: result,
          resolvedAt: new Date().toISOString()
        }
      })
      .eq('id', groupId)

    if (updateError) {
      console.error('Error updating duplicate group:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update duplicate group status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Duplicate group ${resolutionAction} successfully`,
      resolution: {
        action: resolutionAction,
        groupId,
        ...result
      }
    })
  } catch (error) {
    console.error('Error resolving duplicates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resolve duplicates' },
      { status: 500 }
    )
  }
}