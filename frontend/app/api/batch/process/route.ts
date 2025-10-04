import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  // Validate request has body
  let body: any

  try {
    // Check Content-Type header
    const contentType = request.headers.get('content-type')
    console.log('[Batch Process] Content-Type:', contentType)

    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[Batch Process] Invalid Content-Type:', contentType)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Content-Type. Expected application/json',
          details: `Received: ${contentType || 'none'}`
        },
        { status: 400 }
      )
    }

    // Clone request to read body as text first for debugging
    const requestClone = request.clone()
    const bodyText = await requestClone.text()

    console.log('[Batch Process] Raw body length:', bodyText?.length || 0)
    console.log('[Batch Process] Raw body preview:', bodyText?.substring(0, 100) || 'empty')

    // Validate body is not empty
    if (!bodyText || bodyText.trim().length === 0) {
      console.error('[Batch Process] Empty request body')
      return NextResponse.json(
        { success: false, error: 'Request body is empty' },
        { status: 400 }
      )
    }

    // Validate body doesn't start with invalid characters
    const trimmedBody = bodyText.trim()
    if (trimmedBody[0] !== '{' && trimmedBody[0] !== '[') {
      console.error('[Batch Process] Invalid JSON start character:', trimmedBody[0], 'at position 0')
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON format',
          details: `Body starts with '${trimmedBody[0]}' instead of '{' or '['`
        },
        { status: 400 }
      )
    }

    // Parse JSON with error handling
    try {
      body = JSON.parse(bodyText)
    } catch (parseError) {
      console.error('[Batch Process] JSON parse error:', parseError)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'JSON parsing failed',
          bodyPreview: bodyText.substring(0, 100)
        },
        { status: 400 }
      )
    }

    // Validate required fields
    const { imageFiles, batchId } = body

    if (!imageFiles || !Array.isArray(imageFiles)) {
      console.error('[Batch Process] Invalid imageFiles:', typeof imageFiles, Array.isArray(imageFiles))
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid image files',
          details: `Expected array, received: ${typeof imageFiles}`
        },
        { status: 400 }
      )
    }

    if (!batchId || typeof batchId !== 'string') {
      console.error('[Batch Process] Invalid batchId:', typeof batchId)
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid batchId',
          details: `Expected string, received: ${typeof batchId}`
        },
        { status: 400 }
      )
    }

    console.log('[Batch Process] Valid request:', {
      batchId,
      fileCount: imageFiles.length,
      userId
    })

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

      console.log(`[Batch Process] Processing file ${i + 1}/${imageFiles.length}:`, {
        filename: imageFile?.filename,
        hasData: !!imageFile
      })

      try {
        // Validate imageFile object
        if (!imageFile || typeof imageFile !== 'object') {
          throw new Error(`Invalid image file at index ${i}: expected object, got ${typeof imageFile}`)
        }
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
        const savedScan = await prisma.passportScan.create({
          data: {
            userId: userId,
            fileName: imageFile.filename || `batch_${batchId}_${i + 1}.jpg`,
            fileUrl: `placeholder://batch_${batchId}_${i + 1}`, // Placeholder URL
            ocrText: mockExtraction.ocrText,
            passportInfo: mockExtraction.passportInfo,
            confidenceScore: mockExtraction.confidence,
            processingStatus: 'completed',
            batchId
          }
        })

        results.push({
          filename: imageFile.filename,
          status: 'success',
          scanId: savedScan.id,
          confidence: mockExtraction.confidence
        })
        batchStatus.successful++

        console.log(`[Batch Process] File ${i + 1} processed successfully:`, savedScan.id)
      } catch (error) {
        console.error(`[Batch Process] File ${i + 1} processing failed:`, error)

        const errorMessage = error instanceof Error ? error.message : 'Processing failed'
        results.push({
          filename: imageFile?.filename || `unknown_${i}`,
          status: 'failed',
          error: errorMessage
        })
        batchStatus.failed++
      }

      batchStatus.processed++
    }

    batchStatus.endTime = new Date().toISOString()

    console.log('[Batch Process] Batch completed:', {
      batchId,
      total: batchStatus.total,
      successful: batchStatus.successful,
      failed: batchStatus.failed,
      duration: new Date(batchStatus.endTime).getTime() - new Date(batchStatus.startTime).getTime()
    })

    // Save batch processing record
    await prisma.batchOperation.create({
      data: {
        userId: userId,
        batchId,
        operationType: 'passport_processing',
        status: batchStatus.failed === 0 ? 'completed' : 'partial',
        results: {
          ...batchStatus,
          files: results
        }
      }
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
    console.error('[Batch Process] Unexpected error:', error)
    console.error('[Batch Process] Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    return NextResponse.json(
      {
        success: false,
        error: 'Batch processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}