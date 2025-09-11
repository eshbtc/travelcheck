import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import crypto from 'crypto'

// Enhanced duplicate detection specifically for passport scans
function calculateImageHash(imageData: string): string {
  // Create a hash of the image data for comparison
  return crypto.createHash('md5').update(imageData).digest('hex')
}

function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0
  
  const words1 = text1.toLowerCase().split(/\s+/)
  const words2 = text2.toLowerCase().split(/\s+/)
  
  const intersection = words1.filter(word => words2.includes(word))
  const union = Array.from(new Set([...words1, ...words2]))
  
  return intersection.length / union.length
}

function calculateStructuredDataSimilarity(data1: any, data2: any): number {
  if (!data1 || !data2) return 0
  
  const keys = ['passportNumber', 'surname', 'givenNames', 'dateOfBirth', 'nationality']
  let matches = 0
  let comparisons = 0
  
  for (const key of keys) {
    if (data1[key] && data2[key]) {
      comparisons++
      if (data1[key].toString().toLowerCase() === data2[key].toString().toLowerCase()) {
        matches++
      }
    }
  }
  
  return comparisons > 0 ? matches / comparisons : 0
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
    const { scanId, autoResolve = false, similarityThreshold = 0.8 } = body

    let scansToAnalyze: any[]

    if (scanId) {
      // Analyze specific scan for duplicates
      const { data: targetScan, error: scanError } = await supabase
        .from('passport_scans')
        .select('*')
        .eq('id', scanId)
        .eq('user_id', user.id)
        .single()

      if (scanError || !targetScan) {
        return NextResponse.json(
          { success: false, error: 'Scan not found' },
          { status: 404 }
        )
      }

      // Get all other scans by the same user
      const { data: otherScans, error: otherScansError } = await supabase
        .from('passport_scans')
        .select('*')
        .eq('user_id', user.id)
        .neq('id', scanId)
        .order('created_at', { ascending: false })

      if (otherScansError) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch scans for comparison' },
          { status: 500 }
        )
      }

      scansToAnalyze = [targetScan, ...(otherScans || [])]
    } else {
      // Analyze all scans for duplicates
      const { data: allScans, error: allScansError } = await supabase
        .from('passport_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (allScansError) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch scans' },
          { status: 500 }
        )
      }

      scansToAnalyze = allScans || []
    }

    const duplicates = []
    const processed = new Set()

    // Compare each scan with every other scan
    for (let i = 0; i < scansToAnalyze.length; i++) {
      const scan1 = scansToAnalyze[i]
      if (processed.has(scan1.id)) continue

      const duplicateGroup = {
        original: scan1,
        duplicates: [] as any[],
        confidence: 0,
        reasons: [] as string[]
      }

      for (let j = i + 1; j < scansToAnalyze.length; j++) {
        const scan2 = scansToAnalyze[j]
        if (processed.has(scan2.id)) continue

        const similarities: any = {
          text: 0,
          structured: 0,
          image: 0,
          temporal: 0
        }

        // Text similarity
        if (scan1.extracted_text && scan2.extracted_text) {
          similarities.text = calculateTextSimilarity(scan1.extracted_text, scan2.extracted_text)
        }

        // Structured data similarity
        if (scan1.structured_data && scan2.structured_data) {
          similarities.structured = calculateStructuredDataSimilarity(
            scan1.structured_data, 
            scan2.structured_data
          )
        }

        // Image similarity (if image data is available)
        if (scan1.image_data && scan2.image_data) {
          const hash1 = calculateImageHash(scan1.image_data)
          const hash2 = calculateImageHash(scan2.image_data)
          similarities.image = hash1 === hash2 ? 1 : 0
        }

        // Temporal proximity (scans within 1 hour of each other are more likely duplicates)
        const timeDiff = Math.abs(
          new Date(scan1.created_at).getTime() - new Date(scan2.created_at).getTime()
        )
        similarities.temporal = timeDiff < 3600000 ? 0.3 : 0 // 1 hour in milliseconds

        // Calculate overall confidence
        const weights = { text: 0.3, structured: 0.4, image: 0.2, temporal: 0.1 }
        const overallConfidence = 
          similarities.text * weights.text +
          similarities.structured * weights.structured +
          similarities.image * weights.image +
          similarities.temporal * weights.temporal

        if (overallConfidence >= similarityThreshold) {
          const reasons = []
          if (similarities.structured > 0.9) reasons.push('Identical passport data')
          if (similarities.text > 0.8) reasons.push('Very similar extracted text')
          if (similarities.image === 1) reasons.push('Identical image hash')
          if (similarities.temporal > 0) reasons.push('Scanned within short time period')

          duplicateGroup.duplicates.push({
            scan: scan2,
            confidence: overallConfidence,
            similarities,
            reasons
          })
          
          processed.add(scan2.id)
        }
      }

      if (duplicateGroup.duplicates.length > 0) {
        duplicateGroup.confidence = Math.max(...duplicateGroup.duplicates.map(d => d.confidence))
        duplicateGroup.reasons = Array.from(new Set(duplicateGroup.duplicates.flatMap(d => d.reasons)))
        duplicates.push(duplicateGroup)
        processed.add(scan1.id)
      }
    }

    // Auto-resolve if requested
    let resolved = 0
    if (autoResolve) {
      for (const group of duplicates) {
        // Keep the scan with highest confidence score, mark others as duplicates
        const scansToMark = group.duplicates.map(d => d.scan)
        
        for (const duplicateScan of scansToMark) {
          await supabase
            .from('passport_scans')
            .update({
              is_duplicate: true,
              duplicate_of: group.original.id,
              duplicate_confidence: group.confidence,
              updated_at: new Date().toISOString()
            })
            .eq('id', duplicateScan.id)
          
          resolved++
        }
      }
    }

    // Store duplicate detection results
    await supabase
      .from('duplicate_detection_results')
      .insert({
        user_id: user.id,
        detection_type: 'passport_scans',
        scan_id: scanId || null,
        duplicates_found: duplicates.length,
        auto_resolved: autoResolve,
        resolved_count: resolved,
        results: duplicates,
        similarity_threshold: similarityThreshold,
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      duplicates: duplicates.length,
      groups: duplicates,
      resolved: autoResolve ? resolved : 0,
      summary: {
        total_scans_analyzed: scansToAnalyze.length,
        duplicate_groups_found: duplicates.length,
        total_duplicates: duplicates.reduce((sum, group) => sum + group.duplicates.length, 0),
        auto_resolved: autoResolve,
        threshold_used: similarityThreshold
      }
    })

  } catch (error) {
    console.error('Error in duplicate scan detection:', error)
    return NextResponse.json(
      { success: false, error: 'Duplicate detection failed' },
      { status: 500 }
    )
  }
}