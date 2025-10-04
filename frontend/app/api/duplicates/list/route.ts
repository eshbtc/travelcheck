import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

/**
 * GET /api/duplicates/list
 *
 * Retrieves all duplicate groups for the authenticated user.
 * Includes related duplicate items and their metadata.
 */
export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    // Fetch duplicate groups with related items
    const duplicateGroups = await prisma.duplicateGroup.findMany({
      where: {
        userId: userId
      },
      include: {
        duplicateItems: {
          orderBy: {
            isPrimary: 'desc' // Primary item first
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform response to match expected format
    const formattedGroups = duplicateGroups.map(group => ({
      id: group.id,
      groupType: group.groupType,
      similarityScore: group.similarityScore ? parseFloat(group.similarityScore.toString()) : null,
      status: group.status,
      stamps: group.duplicateItems.map(item => ({
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        isPrimary: item.isPrimary,
        confidenceScore: item.confidenceScore ? parseFloat(item.confidenceScore.toString()) : null,
        metadata: item.metadata
      })),
      detectedAt: group.metadata && typeof group.metadata === 'object' && 'detectedAt' in group.metadata
        ? (group.metadata as any).detectedAt
        : group.createdAt.toISOString(),
      createdAt: group.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: formattedGroups
    })
  } catch (error) {
    console.error('Error fetching duplicate groups:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch duplicate groups'
      },
      { status: 500 }
    )
  }
}
