import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (dbError) {
    console.error('[Batch Process] Database connection failed:', dbError)
    return NextResponse.json(
      {
        success: false,
        error: 'Database unavailable',
        details: 'Unable to connect to database. Please try again later.'
      },
      { status: 503 }
    )
  }

  try {
    // Check Content-Type header
    const contentType = request.headers.get('content-type')
    console.log('[Batch Process] Content-Type:', contentType)

    // Accept both multipart/form-data (for file uploads) and application/json (for testing)
    if (!contentType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Content-Type header',
          details: 'Expected multipart/form-data or application/json'
        },
        { status: 400 }
      )
    }

    let imageFiles: any[] = []
    let batchId: string

    // Handle multipart/form-data (file uploads with passport images)
    if (contentType.includes('multipart/form-data')) {
      console.log('[Batch Process] Processing multipart/form-data for file uploads')

      const formData = await request.formData()

      // Extract batchId from form data
      const batchIdField = formData.get('batchId')
      if (!batchIdField || typeof batchIdField !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing or invalid batchId in form data',
            details: `Expected string field 'batchId', received: ${typeof batchIdField}`
          },
          { status: 400 }
        )
      }
      batchId = batchIdField

      // Extract uploaded files
      const uploadedFiles: File[] = []
      formData.forEach((value, key) => {
        if (value instanceof File) {
          uploadedFiles.push(value)
        }
      })

      if (uploadedFiles.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No files uploaded',
            details: 'Expected at least one file in multipart/form-data'
          },
          { status: 400 }
        )
      }

      // Convert File objects to the format expected by processing logic
      imageFiles = await Promise.all(
        uploadedFiles.map(async (file, index) => {
          // Read file as buffer for processing
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          return {
            filename: file.name,
            contentType: file.type,
            size: file.size,
            data: buffer.toString('base64'), // Store as base64 for processing
            index
          }
        })
      )

      console.log('[Batch Process] Parsed multipart form data:', {
        batchId,
        fileCount: imageFiles.length,
        files: imageFiles.map(f => ({ name: f.filename, size: f.size, type: f.contentType }))
      })
    }
    // Handle application/json (for testing or pre-encoded data)
    else if (contentType.includes('application/json')) {
      console.log('[Batch Process] Processing application/json for testing')

      const bodyText = await request.text()

      if (!bodyText || bodyText.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Request body is empty' },
          { status: 400 }
        )
      }

      const body = JSON.parse(bodyText)
      imageFiles = body.imageFiles
      batchId = body.batchId

      if (!imageFiles || !Array.isArray(imageFiles)) {
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
        return NextResponse.json(
          {
            success: false,
            error: 'Missing or invalid batchId',
            details: `Expected string, received: ${typeof batchId}`
          },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported Content-Type',
          details: `Expected multipart/form-data or application/json, received: ${contentType}`
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

        // Save to database with error handling
        let savedScan
        try {
          savedScan = await prisma.passportScan.create({
            data: {
              userId: userId,
              fileName: imageFile.filename || `batch_${batchId}_${i + 1}.jpg`,
              fileUrl: `placeholder://batch_${batchId}_${i + 1}`, // Placeholder URL
              ocrText: mockExtraction.ocrText,
              passportInfo: mockExtraction.passportInfo as any,
              confidenceScore: mockExtraction.confidence,
              processingStatus: 'completed',
              batchId
            }
          })
        } catch (dbError) {
          console.error(`[Batch Process] Database error for file ${i + 1}:`, dbError)
          throw new Error(`Database save failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
        }

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

    // Save batch processing record with error handling
    try {
      await prisma.batchOperation.create({
        data: {
          userId: userId,
          batchId,
          operationType: 'passport_processing',
          status: batchStatus.failed === 0 ? 'completed' : 'partial',
          results: {
            ...batchStatus,
            files: results
          } as any
        }
      })
    } catch (batchOpError) {
      console.warn('[Batch Process] Failed to save batch operation record:', batchOpError)
      // Continue anyway - the actual processing succeeded
    }

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