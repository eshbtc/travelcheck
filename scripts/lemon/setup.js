#!/usr/bin/env node
/*
  Lemon Squeezy bootstrap (MVP):
  - Creates/ensures products + variants for TravelCheck pricing
  - Creates/ensures a webhook
  - Prints checkout URLs + variant IDs for .env

  Requirements:
    LEMON_API_KEY, LEMON_STORE_ID, LEMON_WEBHOOK_URL, LEMON_WEBHOOK_SECRET
*/

const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args))

const API = 'https://api.lemonsqueezy.com/v1'
const HEADERS = () => ({
  'Authorization': `Bearer ${process.env.LEMON_API_KEY}`,
  'Accept': 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json'
})

const STORE_ID = process.env.LEMON_STORE_ID
const WEBHOOK_URL = process.env.LEMON_WEBHOOK_URL
const WEBHOOK_SECRET = process.env.LEMON_WEBHOOK_SECRET
const DRY = process.env.DRY_RUN === '1'

if (!process.env.LEMON_API_KEY || !STORE_ID || !WEBHOOK_URL || !WEBHOOK_SECRET) {
  console.error('Missing required env: LEMON_API_KEY, LEMON_STORE_ID, LEMON_WEBHOOK_URL, LEMON_WEBHOOK_SECRET')
  process.exit(1)
}

const log = (...a) => console.log('[lemon]', ...a)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function api(method, path, body) {
  if (DRY) {
    log('DRY', method, path)
    return { data: null }
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers: HEADERS(),
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function listProducts() {
  const res = await api('GET', `/products`)
  return res?.data || []
}

async function ensureProduct(name, description) {
  const products = await listProducts()
  const found = products.find(p => (p.attributes?.name || '').toLowerCase() === name.toLowerCase())
  if (found) return found
  const body = {
    data: {
      type: 'products',
      attributes: {
        name,
        description: description || '',
        status: 'published',
      },
      relationships: {
        store: { data: { type: 'stores', id: String(STORE_ID) } }
      }
    }
  }
  const res = await api('POST', '/products', body)
  return res.data
}

async function listVariants(productId) {
  const res = await api('GET', `/variants?filter[product_id]=${productId}`)
  return res?.data || []
}

async function ensureVariant(productId, name, priceCents, interval = null) {
  const variants = await listVariants(productId)
  const found = variants.find(v => (v.attributes?.name || '').toLowerCase() === name.toLowerCase())
  if (found) return found
  const attrs = {
    name,
    price: priceCents,
    status: 'published',
    // For subscriptions, set interval as 'month' or 'year'
  }
  if (interval) attrs.interval = interval
  const body = {
    data: {
      type: 'variants',
      attributes: attrs,
      relationships: {
        product: { data: { type: 'products', id: String(productId) } }
      }
    }
  }
  const res = await api('POST', '/variants', body)
  return res.data
}

async function variantCheckoutUrl(variantId) {
  // Create a checkout for variant
  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {},
      },
      relationships: {
        store: { data: { type: 'stores', id: String(STORE_ID) } },
        variant: { data: { type: 'variants', id: String(variantId) } }
      }
    }
  }
  const res = await api('POST', '/checkouts', body)
  return res?.data?.attributes?.url
}

async function ensureWebhook(url, secret) {
  // List webhooks
  const res = await api('GET', `/webhooks`)
  const existing = (res?.data || []).find(w => w.attributes?.url?.toLowerCase() === url.toLowerCase())
  if (existing) return existing
  const body = {
    data: {
      type: 'webhooks',
      attributes: {
        url,
        secret,
        events: [
          'order_created',
          'subscription_created',
          'subscription_payment_success',
          'subscription_cancelled'
        ]
      },
      relationships: {
        store: { data: { type: 'stores', id: String(STORE_ID) } }
      }
    }
  }
  const res2 = await api('POST', '/webhooks', body)
  return res2.data
}

async function main() {
  log('Starting Lemon Squeezy bootstrap (DRY_RUN =', DRY ? '1' : '0', ')')

  // Products
  const oneTime = await ensureProduct('TravelCheck One‑Time Reports', 'Basic, Standard, Premium one‑time report purchases for USCIS travel history')
  const personal = await ensureProduct('TravelCheck Personal', 'Subscriptions for ongoing tracking (monthly / annual)')
  const firms = await ensureProduct('TravelCheck Firms', 'Law firm tiers with included monthly report credits')

  // Variants
  const variants = {}

  // One-time (USD cents)
  variants.basic = await ensureVariant(oneTime.id, 'Basic', 4900)
  variants.standard = await ensureVariant(oneTime.id, 'Standard', 8900)
  variants.premium = await ensureVariant(oneTime.id, 'Premium', 14900)

  // Personal subscription
  variants.personal_monthly = await ensureVariant(personal.id, 'Personal Monthly', 699, 'month')
  variants.personal_annual = await ensureVariant(personal.id, 'Personal Annual', 5900, 'year')

  // Firms subscription (seat pricing could be extended later)
  variants.firm_starter = await ensureVariant(firms.id, 'Starter', 7900, 'month')
  variants.firm_growth = await ensureVariant(firms.id, 'Growth', 12900, 'month')
  variants.firm_scale = await ensureVariant(firms.id, 'Scale', 19900, 'month')

  // Checkouts
  const links = {}
  for (const [k, v] of Object.entries(variants)) {
    // Slight delay to avoid rate limits
    await sleep(250)
    links[k] = await variantCheckoutUrl(v.id)
  }

  // Webhook
  const webhook = await ensureWebhook(WEBHOOK_URL, WEBHOOK_SECRET)

  // Output environment lines
  log('\nAdd these to frontend/.env.local:')
  const envLines = [
    `NEXT_PUBLIC_LEMON_BASIC_CHECKOUT_URL=${links.basic || ''}`,
    `NEXT_PUBLIC_LEMON_STANDARD_CHECKOUT_URL=${links.standard || ''}`,
    `NEXT_PUBLIC_LEMON_PREMIUM_CHECKOUT_URL=${links.premium || ''}`,
    `NEXT_PUBLIC_LEMON_PERSONAL_MONTHLY_CHECKOUT_URL=${links.personal_monthly || ''}`,
    `NEXT_PUBLIC_LEMON_PERSONAL_ANNUAL_CHECKOUT_URL=${links.personal_annual || ''}`,
    `NEXT_PUBLIC_LEMON_FIRM_STARTER_CHECKOUT_URL=${links.firm_starter || ''}`,
    `NEXT_PUBLIC_LEMON_FIRM_GROWTH_CHECKOUT_URL=${links.firm_growth || ''}`,
    `NEXT_PUBLIC_LEMON_FIRM_SCALE_CHECKOUT_URL=${links.firm_scale || ''}`,
    '',
    `LEMON_VARIANT_ID_BASIC=${variants.basic?.id || ''}`,
    `LEMON_VARIANT_ID_STANDARD=${variants.standard?.id || ''}`,
    `LEMON_VARIANT_ID_PREMIUM=${variants.premium?.id || ''}`,
    `LEMON_VARIANT_ID_PERSONAL_MONTHLY=${variants.personal_monthly?.id || ''}`,
    `LEMON_VARIANT_ID_PERSONAL_ANNUAL=${variants.personal_annual?.id || ''}`,
    `LEMON_VARIANT_ID_FIRM_STARTER=${variants.firm_starter?.id || ''}`,
    `LEMON_VARIANT_ID_FIRM_GROWTH=${variants.firm_growth?.id || ''}`,
    `LEMON_VARIANT_ID_FIRM_SCALE=${variants.firm_scale?.id || ''}`,
    '',
    `LEMON_SQUEEZY_WEBHOOK_SECRET=${WEBHOOK_SECRET}`,
  ]
  console.log(envLines.join('\n'))

  log('\nDone.')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})

