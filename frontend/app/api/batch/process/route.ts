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
    const { imageFiles, batchId } = body

    if (!imageFiles || !Array.isArray(imageFiles)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid image files' },
        { status: 400 }
      )
    }

    const results = []
    const batchStatus: any = {
      total: imageFiles.length,
      processed: 0,
      successful: 0,
      failed: 0,
      startTime: new Date().toISOString()
    }

    // Process each image in the batch
    for (let i = 0; i < imageFiles.length; i++) {
      const imageFile = imageFiles[i]
      
      try {
        // Mock OCR processing (in production, use Google Vision API)
        const mockExtraction = {
          ocrText: `PASSPORT ${i + 1}\nUSA\nDOE, JOHN\n01 JAN 1980\nPassport No: 12345${i}`,
          passportInfo: {
            passportNumber: `12345${i}`,
            name: 'JOHN DOE',
            nationality: 'USA',
            dateOfBirth: '1980-01-01'
          },
          confidence: Math.random() * 0.3 + 0.7 // Random confidence 0.7-1.0
        }

        // Save to database
        const { data: savedScan, error } = await supabase
          .from('passport_scans')
          .insert({
            user_id: user.id,
            file_name: imageFile.filename || `batch_${batchId}_${i + 1}.jpg`,
            ocr_text: mockExtraction.ocrText,
            passport_info: mockExtraction.passportInfo,
            confidence_score: mockExtraction.confidence,
            processing_status: 'completed',
            batch_id: batchId,
            created_at: new Date().toISOString(),
          })
          .select()

        if (error) {
          throw error
        }

        results.push({
          filename: imageFile.filename,
          status: 'success',
          scanId: savedScan[0].id,
          confidence: mockExtraction.confidence
        })
        batchStatus.successful++
      } catch (error) {
        results.push({
          filename: imageFile.filename,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Processing failed'
        })
        batchStatus.failed++
      }

      batchStatus.processed++
    }

    batchStatus.endTime = new Date().toISOString()
    
    // Save batch processing record
    await supabase
      .from('batch_operations')
      .insert({
        user_id: user.id,
        batch_id: batchId,
        operation_type: 'passport_processing',
        status: batchStatus.failed === 0 ? 'completed' : 'partial',
        results: {
          ...batchStatus,
          files: results
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      batchId,
      results,
      summary: {
        total: batchStatus.total,
        successful: batchStatus.successful,
        failed: batchStatus.failed,
        successRate: (batchStatus.successful / batchStatus.total) * 100
      }
    })
  } catch (error) {
    console.error('Error in batch processing:', error)
    return NextResponse.json(
      { success: false, error: 'Batch processing failed' },
      { status: 500 }
    )
  }
}