import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

// Simple OCR simulation - in production you'd use Google Vision API
function simulateOCR(imageData: string): {
  extractedText: string
  structuredData: any
  confidence: number
} {
  // This is a mock implementation
  // In production, you'd call Google Vision API or similar service
  
  const mockText = `
    PASSPORT
    United States of America
    Type: P
    Code: USA
    Passport No.: 123456789
    Surname: DOE
    Given Names: JOHN
    Nationality: USA
    Date of Birth: 01 JAN 1980
    Sex: M
    Place of Birth: NEW YORK, USA
    Date of Issue: 01 JAN 2020
    Date of Expiry: 01 JAN 2030
    Authority: UNITED STATES DEPARTMENT OF STATE
  `

  const structuredData = {
    documentType: 'passport',
    country: 'USA',
    passportNumber: '123456789',
    surname: 'DOE',
    givenNames: 'JOHN',
    nationality: 'USA',
    dateOfBirth: '1980-01-01',
    sex: 'M',
    placeOfBirth: 'NEW YORK, USA',
    dateOfIssue: '2020-01-01',
    dateOfExpiry: '2030-01-01',
    issuingAuthority: 'UNITED STATES DEPARTMENT OF STATE'
  }

  return {
    extractedText: mockText.trim(),
    structuredData,
    confidence: 0.85
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const body = await request.json()
    const { imageData, file_name } = body

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: 'Missing image data' },
        { status: 400 }
      )
    }

    // Validate base64 image data
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid image format' },
        { status: 400 }
      )
    }

    // Extract OCR data (using mock function for now)
    const ocrResult = simulateOCR(imageData)

    // Save passport scan to database
    const savedScan = await prisma.passportScan.create({
      data: {
        userId: userId,
        fileName: file_name || 'passport_scan.jpg',
        fileUrl: imageData.substring(0, 100) + "...", // Store first 100 chars as placeholder
        ocrText: ocrResult.extractedText,
        passportInfo: ocrResult.structuredData as any,
        confidenceScore: ocrResult.confidence,
        processingStatus: 'completed',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: savedScan.id,
        extractedText: ocrResult.extractedText,
        structuredData: ocrResult.structuredData,
        confidence: ocrResult.confidence,
        file_name: file_name || 'passport_scan.jpg',
      },
    })
  } catch (error) {
    console.error('Error extracting passport data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to extract passport data' },
      { status: 500 }
    )
  }
}