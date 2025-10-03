import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../../../src/lib/api-auth'
import { prisma } from '../../../../src/lib/prisma'

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())

  const userDoc = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true }
  })

  if (adminEmails.includes(userDoc?.email?.toLowerCase() || '')) return true
  return userDoc?.role === 'admin'
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id

  // Admin only operation
  if (!(await isAdmin(userId))) {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { operation = 'timestamps', dryRun = true } = body

    let results: any = {
      updated: 0,
      errors: 0,
      operations: []
    }

    switch (operation) {
      case 'timestamps':
        // Backfill entries where createdAt is suspiciously old (likely needs backfill)
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        const entriesWithoutTimestamps = await prisma.travelEntry.findMany({
          where: {
            createdAt: {
              lt: oneYearAgo
            },
            entryDate: {
              not: null
            }
          },
          select: {
            id: true,
            entryDate: true
          }
        })

        for (const entry of entriesWithoutTimestamps) {
          if (!dryRun && entry.entryDate) {
            try {
              await prisma.travelEntry.update({
                where: { id: entry.id },
                data: {
                  createdAt: entry.entryDate,
                  updatedAt: new Date()
                }
              })
              results.updated++
            } catch (error) {
              results.errors++
            }
          } else {
            results.updated++
          }

          results.operations.push({
            type: 'timestamp_backfill',
            id: entry.id,
            action: dryRun ? 'would_update' : 'updated'
          })
        }
        break

      case 'confidence_scores':
        // Backfill missing confidence scores
        const scansWithoutScores = await prisma.passportScan.findMany({
          where: {
            confidenceScore: null
          },
          select: {
            id: true,
            passportInfo: true
          }
        })

        for (const scan of scansWithoutScores) {
          const mockConfidence = Math.random() * 0.3 + 0.6 // 0.6-0.9

          if (!dryRun) {
            try {
              await prisma.passportScan.update({
                where: { id: scan.id },
                data: { confidenceScore: mockConfidence }
              })
              results.updated++
            } catch (error) {
              results.errors++
            }
          } else {
            results.updated++
          }

          results.operations.push({
            type: 'confidence_backfill',
            id: scan.id,
            confidence: mockConfidence,
            action: dryRun ? 'would_update' : 'updated'
          })
        }
        break

      case 'user_settings':
        // Backfill missing user settings
        // Note: settings has a default value in schema, so checking for empty object
        const usersWithoutSettings = await prisma.user.findMany({
          where: {
            settings: {
              equals: {}
            }
          },
          select: {
            id: true,
            settings: true
          }
        })

        for (const userRecord of usersWithoutSettings) {
          const defaultSettings = {
            notifications: true,
            theme: 'light',
            timezone: 'UTC'
          }

          if (!dryRun) {
            try {
              await prisma.user.update({
                where: { id: userRecord.id },
                data: { settings: defaultSettings as any }
              })
              results.updated++
            } catch (error) {
              results.errors++
            }
          } else {
            results.updated++
          }

          results.operations.push({
            type: 'settings_backfill',
            user_id: userRecord.id,
            action: dryRun ? 'would_update' : 'updated'
          })
        }
        break

      case 'processing_status':
        // Backfill missing processing status
        const emailsWithoutStatus = await prisma.flightEmail.findMany({
          where: {
            processingStatus: null
          },
          select: {
            id: true
          }
        })

        for (const email of emailsWithoutStatus) {
          if (!dryRun) {
            try {
              await prisma.flightEmail.update({
                where: { id: email.id },
                data: { processingStatus: 'completed' }
              })
              results.updated++
            } catch (error) {
              results.errors++
            }
          } else {
            results.updated++
          }

          results.operations.push({
            type: 'status_backfill',
            id: email.id,
            action: dryRun ? 'would_update' : 'updated'
          })
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid operation. Use: timestamps, confidence_scores, user_settings, processing_status' },
          { status: 400 }
        )
    }

    // Log the backfill operation
    if (!dryRun) {
      await prisma.systemLog.create({
        data: {
          userId: userId,
          operation: 'data_backfill',
          details: {
            operation,
            results,
            timestamp: new Date().toISOString()
          } as any
        }
      })
    }

    return NextResponse.json({
      success: true,
      operation,
      dryRun,
      results: {
        ...results,
        summary: `${dryRun ? 'Would update' : 'Updated'} ${results.updated} records, ${results.errors} errors`
      }
    })

  } catch (error) {
    console.error('Error in data backfill:', error)
    return NextResponse.json(
      { success: false, error: 'Backfill operation failed' },
      { status: 500 }
    )
  }
}
