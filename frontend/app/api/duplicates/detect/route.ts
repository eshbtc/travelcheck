import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

interface TravelEntry {
  id: string
  entry_date: string
  exit_date: string | null
  country_code: string
  country_name: string
  city: string | null
  entry_type: string
  source_type: string | null
  flight_number: string | null
  confirmation_number: string | null
}

function calculateSimilarity(entry1: TravelEntry, entry2: TravelEntry): number {
  let score = 0
  let factors = 0

  // Date similarity (most important)
  const date1 = new Date(entry1.entry_date)
  const date2 = new Date(entry2.entry_date)
  const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysDiff <= 1) score += 0.4 // Same day or next day
  else if (daysDiff <= 3) score += 0.2 // Within 3 days
  factors += 0.4

  // Country similarity
  if (entry1.country_code === entry2.country_code || 
      entry1.country_name === entry2.country_name) {
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
  if (entry1.flight_number && entry2.flight_number) {
    if (entry1.flight_number === entry2.flight_number) {
      score += 0.1
    }
    factors += 0.1
  }

  if (entry1.confirmation_number && entry2.confirmation_number) {
    if (entry1.confirmation_number === entry2.confirmation_number) {
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
    let query = supabase
      .from('travel_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: true })

    if (entryTypes && entryTypes.length > 0) {
      query = query.in('entry_type', entryTypes)
    }

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching travel entries:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch travel entries' },
        { status: 500 }
      )
    }

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
      const { data: savedGroup, error: groupError } = await supabase
        .from('duplicate_groups')
        .insert({
          user_id: user.id,
          group_type: 'travel_entry',
          similarity_score: group.similarity,
          status: 'pending',
          metadata: {
            detectionThreshold: threshold,
            detectedAt: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        })
        .select()

      if (groupError) {
        console.error('Error saving duplicate group:', groupError)
        continue
      }

      const groupId = savedGroup[0].id

      // Save duplicate items
      const items = group.entries.map((entry, index) => ({
        group_id: groupId,
        item_type: 'travel_entry',
        item_id: entry.id,
        is_primary: index === 0,
        confidence_score: group.similarity,
        metadata: {
          entry_date: entry.entry_date,
          country: entry.country_code || entry.country_name,
          entry_type: entry.entry_type
        }
      }))

      const { error: itemsError } = await supabase
        .from('duplicate_items')
        .insert(items)

      if (!itemsError) {
        savedGroups.push({
          id: groupId,
          ...group,
          items
        })
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