import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../src/lib/prisma'

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') || ''
  if (token && auth === `Bearer ${token}`) return true
  const url = new URL(req.url)
  const q = url.searchParams.get('token')
  return !!token && q === token
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const year = now.getFullYear()

    // Fetch active entitlements
    const ents = await prisma.billingEntitlement.findMany({
      where: { status: 'active' }
    })

    const updated: string[] = []

    for (const ent of ents) {
      const plan: string = ent.planCode || ''
      const isFirm = ['firm_starter', 'firm_growth', 'firm_scale'].includes(plan)
      const isPersonalAnnual = plan === 'personal_annual'
      const updates: any = {}
      let shouldUpdate = false

      if (isFirm) {
        const last = ent.lastMonthlyResetAt ? new Date(ent.lastMonthlyResetAt) : null
        if (!last || last < firstOfMonth) {
          const quota = ent.reportCreditsMonthlyQuota || 0
          updates.reportCreditsBalance = (ent.reportCreditsBalance || 0) + quota
          updates.lastMonthlyResetAt = now
          shouldUpdate = true
        }
      }

      if (isPersonalAnnual) {
        const lastYear = ent.lastAnnualResetYear || 0
        if (lastYear !== year) {
          const annual = ent.annualIncludedReports ?? 1
          updates.reportCreditsBalance = (updates.reportCreditsBalance ?? ent.reportCreditsBalance ?? 0) + annual
          updates.lastAnnualResetYear = year
          shouldUpdate = true
        }
      }

      if (shouldUpdate) {
        await prisma.billingEntitlement.update({
          where: { id: ent.id },
          data: updates
        })
        updated.push(ent.id)
      }
    }

    return NextResponse.json({ ok: true, updatedCount: updated.length })
  } catch (e) {
    console.error('reset-credits error', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}

