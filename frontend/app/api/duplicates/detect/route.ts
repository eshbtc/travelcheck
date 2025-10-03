import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface TravelEntry {
  id: string
  entryDate: Date | null
  exitDate: Date | null
  countryCode: string | null
  countryName: string | null
  city: string | null
  entryType: string
  sourceType: string | null
  flightNumber: string | null
  confirmationNumber: string | null
}

function calculateSimilarity(entry1: TravelEntry, entry2: TravelEntry): number {
  let score = 0
  let factors = 0

  // Date similarity (most important)
  if (!entry1.entryDate || !entry2.entryDate) return 0
  const date1 = new Date(entry1.entryDate)
  const date2 = new Date(entry2.entryDate)
  const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)

  if (daysDiff <= 1) score += 0.4 // Same day or next day
  else if (daysDiff <= 3) score += 0.2 // Within 3 days
  factors += 0.4

  // Country similarity
  if (entry1.countryCode === entry2.countryCode ||
      entry1.countryName === entry2.countryName) {
    score += 0.3
  }
  factors += 0.3

  // City similarity (if available)
  if (entry1.city && entry2.city) {
    if (entry1.city.toLowerCase() === entry2.city.toLowerCase()) {
      score += 0.1
    }
    factors += 0.1
  }

  // Flight/confirmation number similarity
  if (entry1.flightNumber && entry2.flightNumber) {
    if (entry1.flightNumber === entry2.flightNumber) {
      score += 0.1
    }
    factors += 0.1
  }

  if (entry1.confirmationNumber && entry2.confirmationNumber) {
    if (entry1.confirmationNumber === entry2.confirmationNumber) {
      score += 0.1
    }
    factors += 0.1
  }

  return factors > 0 ? score / factors : 0
}

function findDuplicateGroups(entries: TravelEntry[], threshold: number = 0.7): Array<{
  entries: TravelEntry[]
  similarity: number
}> {
  const duplicateGroups = []
  const processed = new Set<string>()

  for (let i = 0; i < entries.length; i++) {
    if (processed.has(entries[i].id)) continue

    const group = [entries[i]]
    processed.add(entries[i].id)

    for (let j = i + 1; j < entries.length; j++) {
      if (processed.has(entries[j].id)) continue

      const similarity = calculateSimilarity(entries[i], entries[j])
      if (similarity >= threshold) {
        group.push(entries[j])
        processed.add(entries[j].id)
      }
    }

    if (group.length > 1) {
      const avgSimilarity = group.reduce((sum, _, idx) => {
        if (idx === 0) return sum
        return sum + calculateSimilarity(group[0], group[idx])
      }, 0) / (group.length - 1)

      duplicateGroups.push({
        entries: group,
        similarity: avgSimilarity
      })
    }
  }

  return duplicateGroups.sort((a, b) => b.similarity - a.similarity)
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
    const { threshold = 0.7, entryTypes } = body

    // Get travel entries
    const entries = await prisma.travelEntry.findMany({
      where: {
        userId: user.id,
        ...(entryTypes && entryTypes.length > 0 ? { entryType: { in: entryTypes } } : {})
      },
      orderBy: {
        entryDate: 'asc'
      }
    })

    if (!entries || entries.length < 2) {
      return NextResponse.json({
        success: true,
        duplicateGroups: [],
        summary: {
          totalEntries: entries?.length || 0,
          duplicateGroups: 0,
          potentialDuplicates: 0
        }
      })
    }

    // Find duplicate groups
    const duplicateGroups = findDuplicateGroups(entries, threshold)

    // Save duplicate groups to database
    const savedGroups = []
    for (const group of duplicateGroups) {
      try {
        const savedGroup = await prisma.duplicateGroup.create({
          data: {
            userId: user.id,
            groupType: 'travel_entry',
            similarityScore: group.similarity,
            status: 'pending',
            metadata: {
              detectionThreshold: threshold,
              detectedAt: new Date().toISOString()
            }
          }
        })

        // Save duplicate items
        const items = group.entries.map((entry, index) => ({
          groupId: savedGroup.id,
          itemType: 'travel_entry',
          itemId: entry.id,
          isPrimary: index === 0,
          confidenceScore: group.similarity,
          metadata: {
            entryDate: entry.entryDate?.toISOString(),
            country: entry.countryCode || entry.countryName,
            entryType: entry.entryType
          }
        }))

        await prisma.duplicateItem.createMany({
          data: items
        })

        savedGroups.push({
          id: savedGroup.id,
          ...group,
          items
        })
      } catch (error) {
        console.error('Error saving duplicate group:', error)
        continue
      }
    }

    const totalPotentialDuplicates = duplicateGroups.reduce((sum, group) => sum + group.entries.length, 0)

    return NextResponse.json({
      success: true,
      duplicateGroups: savedGroups,
      summary: {
        totalEntries: entries.length,
        duplicateGroups: duplicateGroups.length,
        potentialDuplicates: totalPotentialDuplicates,
        threshold,
        detectedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error detecting duplicates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to detect duplicates' },
      { status: 500 }
    )
  }
}