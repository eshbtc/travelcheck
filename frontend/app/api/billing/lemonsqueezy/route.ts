import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'

// Verify HMAC signature from Lemon Squeezy
function verifySignature(rawBody: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature) return false
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

// Helper: map variant ID to plan code
function planFromVariant(v?: number | null): string | null {
  if (!v) return null
  const env = (key: string) => parseInt(process.env[key] || '')
  const map: Record<number, string> = {}
  const entries: Array<[string, string]> = [
    ['LEMON_VARIANT_ID_BASIC', 'one_time_basic'],
    ['LEMON_VARIANT_ID_STANDARD', 'one_time_standard'],
    ['LEMON_VARIANT_ID_PREMIUM', 'one_time_premium'],
    ['LEMON_VARIANT_ID_PERSONAL_MONTHLY', 'personal_monthly'],
    ['LEMON_VARIANT_ID_PERSONAL_ANNUAL', 'personal_annual'],
    ['LEMON_VARIANT_ID_FIRM_STARTER', 'firm_starter'],
    ['LEMON_VARIANT_ID_FIRM_GROWTH', 'firm_growth'],
    ['LEMON_VARIANT_ID_FIRM_SCALE', 'firm_scale'],
  ]
  
  entries.forEach(([envKey, planCode]) => {
    const variantId = env(envKey)
    if (variantId) map[variantId] = planCode
  })
  
  return map[v] || null
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET
    const sig = request.headers.get('X-Signature')
    const eventName = request.headers.get('X-Event-Name') || ''

    // Read raw body for signature verification
    const rawBody = await request.text()
    const ok = verifySignature(rawBody, sig, secret)
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    // Idempotency: hash raw body and store in billing_webhook_events
    const dedupeHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex')
    const exists = await supabase
      .from('billing_webhook_events')
      .select('id')
      .eq('dedupe_hash', dedupeHash)
      .maybeSingle()
    if (exists.data) {
      return NextResponse.json({ ok: true, deduped: true })
    }

    // Minimal routing by event name (e.g., order_created, subscription_created, subscription_payment_success, subscription_cancelled)
    // Lemon Squeezy sends JSON:API with data + meta
    const data = payload?.data
    const meta = payload?.meta || {}

    // Attempt to extract key identifiers
    const customerEmail: string | null = data?.attributes?.user_email || data?.attributes?.customer_email || payload?.meta?.customer_email || null
    const productId: number | null = data?.attributes?.product_id || data?.attributes?.variant?.product_id || null
    const variantId: number | null = data?.attributes?.variant_id || data?.attributes?.variant?.id || null
    const subscriptionStatus: string | null = data?.attributes?.status || data?.attributes?.state || null

    // Basic abuse throttle: limit bursts per customer
    if (customerEmail) {
      const since = new Date(Date.now() - 10_000).toISOString()
      const { count } = await supabase
        .from('billing_webhook_events')
        .select('id', { count: 'exact', head: true })
        .eq('customer_email', customerEmail)
        .gt('received_at', since)
      if ((count || 0) > 5) {
        return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
      }
    }

    // Persist webhook envelope for audit/idempotency
    await supabase.from('billing_webhook_events').insert({
      dedupe_hash: dedupeHash,
      event_name: eventName,
      customer_email: customerEmail,
      raw: payload
    } as any)


    async function findUserIdByEmail(email: string | null): Promise<string | null> {
      if (!email) return null
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      return user?.id || null
    }

    async function upsertEntitlements(userId: string, updates: Partial<{ plan_code: string; status: string; report_credits_balance: number; report_credits_monthly_quota: number; seats_limit: number; api_minimum_cents: number }>) {
      // Try update; if missing, insert
      const { data: existing } = await supabase
        .from('billing_entitlements')
        .select('id, report_credits_balance')
        .eq('user_id', userId)
        .maybeSingle()
      if (existing) {
        const inc = updates.report_credits_balance
        const newBalance = typeof inc === 'number' ? (existing.report_credits_balance || 0) + inc : undefined
        const patch: any = { ...updates }
        if (typeof newBalance === 'number') patch.report_credits_balance = newBalance
        await supabase
          .from('billing_entitlements')
          .update(patch)
          .eq('id', existing.id)
      } else {
        await supabase
          .from('billing_entitlements')
          .insert({ user_id: userId, status: 'active', ...updates } as any)
      }
    }

    // Minimal event routing for MVP
    const plan = planFromVariant(variantId)
    const userId = await findUserIdByEmail(customerEmail)
    if (userId && plan) {
      if (eventName.includes('order') && plan.startsWith('one_time_')) {
        // Grant one report credit for one-time purchase
        await upsertEntitlements(userId, { plan_code: plan, report_credits_balance: 1 })
      }
      if (eventName.includes('subscription_created') || eventName.includes('subscription_payment_success')) {
        // Personal / Firm subscriptions
        const quota = plan === 'firm_starter' ? 10 : plan === 'firm_growth' ? 30 : plan === 'firm_scale' ? 100 : 0
        await upsertEntitlements(userId, { plan_code: plan, status: 'active', report_credits_monthly_quota: quota })
        // Upsert subscription record if possible
        const lemonSubId = data?.id?.toString?.() || undefined
        if (lemonSubId) {
          const { data: sub } = await supabase
            .from('billing_subscriptions')
            .select('id')
            .eq('lemon_subscription_id', lemonSubId)
            .maybeSingle()
          const payloadSub: any = {
            user_id: userId,
            lemon_subscription_id: lemonSubId,
            product_id: productId || undefined,
            variant_id: variantId || undefined,
            plan_code: plan,
            status: subscriptionStatus || 'active',
          }
          if (sub) {
            await supabase.from('billing_subscriptions').update(payloadSub).eq('id', sub.id)
          } else {
            await supabase.from('billing_subscriptions').insert(payloadSub)
          }
        }
      }
      if (eventName.includes('subscription_cancelled') || eventName.includes('subscription_expired')) {
        await upsertEntitlements(userId, { status: 'cancelled' })
      }
    }

    // TODO: Map product/variant IDs to internal SKUs and provision entitlements accordingly
    // For MVP, we log an audit row if an audit table exists; otherwise no-op
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          category: 'billing',
          action: 'lemonsqueezy_webhook',
          details: { eventName, customerEmail, productId, variantId, subscriptionStatus, meta },
        } as any)
      if (error) {
        // Table may not exist in early MVP; ignore
        console.warn('Audit log insert failed:', error.message)
      }
    } catch (e) {
      console.warn('Audit log insert error:', (e as Error).message)
    }

    // Return success with plan mapping & user reference for logs
    return NextResponse.json({ ok: true, plan, userId })
  } catch (err) {
    console.error('Lemon Squeezy webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  // Simple health check endpoint
  return NextResponse.json({ ok: true })
}
