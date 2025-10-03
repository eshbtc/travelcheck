import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

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
    const group = await prisma.duplicateGroup.findFirst({
      where: {
        id: groupId,
        userId: userId
      }
    })

    if (!group) {
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
        const items = await prisma.duplicateItem.findMany({
          where: {
            groupId
          }
        })

        if (!items) {
          return NextResponse.json(
            { success: false, error: 'Failed to fetch duplicate items' },
            { status: 500 }
          )
        }

        // Update primary item designation
        await prisma.duplicateItem.updateMany({
          where: { groupId },
          data: { isPrimary: false }
        })

        await prisma.duplicateItem.updateMany({
          where: {
            groupId,
            itemId: primaryItemId
          },
          data: { isPrimary: true }
        })

        // Mark non-primary travel entries as merged/ignored
        const nonPrimaryItems = items.filter(item => item.itemId !== primaryItemId)
        for (const item of nonPrimaryItems) {
          await prisma.travelEntry.update({
            where: { id: item.itemId },
            data: {
              status: 'ignored',
              notes: `Merged into entry ${primaryItemId}`
            }
          })
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

        // Delete travel entries (with additional security check)
        await prisma.travelEntry.deleteMany({
          where: {
            id: { in: itemsToDelete },
            userId: userId // Additional security check
          }
        })

        // Remove corresponding duplicate items
        await prisma.duplicateItem.deleteMany({
          where: {
            groupId,
            itemId: { in: itemsToDelete }
          }
        })

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
    await prisma.duplicateGroup.update({
      where: { id: groupId },
      data: {
        status: 'resolved',
        resolutionAction,
        resolvedBy: userId,
        resolvedAt: new Date(),
        metadata: {
          ...(group.metadata as object || {}),
          resolutionDetails: result,
          resolvedAt: new Date().toISOString()
        }
      }
    })

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