import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Simple health check without database dependency
  // Database check moved to /api/health/db for detailed diagnostics
  return NextResponse.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0.0-railway',
    uptime: process.uptime(),
  })
}