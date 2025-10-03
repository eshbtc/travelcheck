import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const scans = await prisma.passportScan.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      scans: scans || [],
    })
  } catch (error) {
    console.error('Error getting passport scans:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get passport scans' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  try {
    const body = await request.json()
    const { fileUrl, analysisResults, fileName } = body

    // Extract stamps for the extracted_stamps field
    const extractedStamps = analysisResults?.data?.stamps || []

    const data = await prisma.passportScan.create({
      data: {
        userId: userId,
        fileUrl,
        analysisResults: analysisResults as any,
        extractedStamps: extractedStamps as any,
        fileName,
        processingStatus: extractedStamps.length > 0 ? 'completed' : 'pending',
        confidenceScore: extractedStamps.length > 0 ? Math.max(...extractedStamps.map((s: any) => s.confidence || 0.5)) : 0.5,
      },
    })

    // Create travel entries from extracted stamps
    if (extractedStamps.length > 0) {
      const travelEntries = extractedStamps.map((stamp: any) => ({
        userId: userId,
        entryType: 'passport_stamp',
        sourceId: data.id,
        sourceType: 'passport_scan',
        countryCode: stamp.country || 'UNKNOWN',
        countryName: stamp.country || 'UNKNOWN',
        city: stamp.location,
        entryDate: new Date(stamp.date),
        exitDate: stamp.type === 'exit' ? new Date(stamp.date) : null,
        purpose: stamp.type === 'entry' ? 'entry' : stamp.type === 'exit' ? 'exit' : 'unknown',
        transportType: 'other',
        status: 'pending',
        confidenceScore: stamp.confidence || 0.5,
        isVerified: false,
        manualOverride: false,
        notes: `Extracted from passport scan - ${stamp.type} stamp`,
        metadata: {
          passport_extracted: true,
          stamp_type: stamp.type,
          original_text: stamp.metadata?.originalText,
          extraction_source: stamp.metadata?.extractedFrom,
        },
      }))

      try {
        await prisma.travelEntry.createMany({
          data: travelEntries,
          skipDuplicates: true,
        })
        console.log(`Created ${travelEntries.length} travel entries from passport stamps`)
      } catch (entriesError) {
        console.error('Error saving travel entries from passport stamps:', entriesError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Passport scan saved successfully',
      scan: data,
      travelEntriesCreated: extractedStamps.length,
    })
  } catch (error) {
    console.error('Error saving passport scan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save passport scan' },
      { status: 500 }
    )
  }
}