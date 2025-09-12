import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

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
    const { data: ents, error } = await supabase
      .from('billing_entitlements')
      .select('*')
      .eq('status', 'active')

    if (error) throw error

    const updated: string[] = []

    for (const ent of ents || []) {
      const plan: string = ent.plan_code || ''
      const isFirm = ['firm_starter', 'firm_growth', 'firm_scale'].includes(plan)
      const isPersonalAnnual = plan === 'personal_annual'
      const updates: any = {}
      let shouldUpdate = false

      if (isFirm) {
        const last = ent.last_monthly_reset_at ? new Date(ent.last_monthly_reset_at) : null
        if (!last || last < firstOfMonth) {
          const quota = ent.report_credits_monthly_quota || 0
          updates.report_credits_balance = (ent.report_credits_balance || 0) + quota
          updates.last_monthly_reset_at = now.toISOString()
          shouldUpdate = true
        }
      }

      if (isPersonalAnnual) {
        const lastYear = ent.last_annual_reset_year || 0
        if (lastYear !== year) {
          const annual = ent.annual_included_reports ?? 1
          updates.report_credits_balance = (updates.report_credits_balance ?? ent.report_credits_balance ?? 0) + annual
          updates.last_annual_reset_year = year
          shouldUpdate = true
        }
      }

      if (shouldUpdate) {
        const { error: upErr } = await supabase
          .from('billing_entitlements')
          .update(updates)
          .eq('id', ent.id)
        if (upErr) throw upErr
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

