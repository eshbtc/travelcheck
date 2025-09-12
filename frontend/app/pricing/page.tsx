import React from 'react'

export const metadata = {
  title: 'Pricing | TravelCheck',
  description: 'Pricing plans for USCIS-ready travel history reports, residency tracking, law firms, and API access.'
}

function PlanButton({ href, children, disabled = false }: { href?: string; children: React.ReactNode; disabled?: boolean }) {
  if (!href || disabled) {
    return (
      <button className="w-full mt-4 h-11 rounded-md bg-gray-300 text-gray-700 cursor-not-allowed" disabled>
        {children}
      </button>
    )
  }
  return (
    <a href={href} className="w-full mt-4 inline-flex items-center justify-center h-11 rounded-md bg-brand-primary text-white hover:opacity-90">
      {children}
    </a>
  )
}

export default function PricingPage() {
  const lemon = {
    basic: process.env.NEXT_PUBLIC_LEMON_BASIC_CHECKOUT_URL,
    standard: process.env.NEXT_PUBLIC_LEMON_STANDARD_CHECKOUT_URL,
    premium: process.env.NEXT_PUBLIC_LEMON_PREMIUM_CHECKOUT_URL,
    personalMonthly: process.env.NEXT_PUBLIC_LEMON_PERSONAL_MONTHLY_CHECKOUT_URL,
    personalAnnual: process.env.NEXT_PUBLIC_LEMON_PERSONAL_ANNUAL_CHECKOUT_URL,
    firmStarter: process.env.NEXT_PUBLIC_LEMON_FIRM_STARTER_CHECKOUT_URL,
    firmGrowth: process.env.NEXT_PUBLIC_LEMON_FIRM_GROWTH_CHECKOUT_URL,
    firmScale: process.env.NEXT_PUBLIC_LEMON_FIRM_SCALE_CHECKOUT_URL,
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-3">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">Pricing that fits how you travel</h1>
          <p className="mt-3 text-text-secondary max-w-2xl mx-auto">
            Get a USCIS‑ready travel history in hours, plus ongoing residency day‑count tracking and firm‑grade tools.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <a href="/reports/generate" className="h-11 px-5 rounded-md bg-brand-primary text-white inline-flex items-center justify-center">Start free preview</a>
            <a href="mailto:sales@travelcheck.com" className="h-11 px-5 rounded-md border border-border-light inline-flex items-center justify-center">Talk to sales</a>
            <a href="mailto:api@travelcheck.com?subject=API%20Access" className="h-11 px-5 rounded-md border border-border-light inline-flex items-center justify-center">Get API access</a>
          </div>
        </div>
      </section>

      {/* Section toggle */}
      <section className="mx-auto max-w-6xl px-6 pb-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a href="#immigration" className="px-3 h-9 rounded-md border border-border-light bg-white text-sm inline-flex items-center">Immigration</a>
          <a href="#subscription" className="px-3 h-9 rounded-md border border-border-light bg-white text-sm inline-flex items-center">Subscription</a>
          <a href="#firms" className="px-3 h-9 rounded-md border border-border-light bg-white text-sm inline-flex items-center">Firms</a>
          <a href="#api" className="px-3 h-9 rounded-md border border-border-light bg-white text-sm inline-flex items-center">API</a>
        </div>
      </section>

      {/* One-time Immigration Reports */}
      <section id="immigration" className="mx-auto max-w-6xl px-6 pb-4 scroll-mt-24">
        <h2 className="text-2xl font-semibold">One‑Time Immigration Reports</h2>
        <p className="text-text-secondary mt-1">USCIS‑formatted exports with sources and confidence scoring.</p>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {/* Basic */}
          <div className="rounded-xl border border-border-light bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">Basic</h3>
              <div className="text-2xl font-bold">$49</div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>• Email import and itinerary reconstruction (1 inbox)</li>
              <li>• Auto‑dedupe and timeline editor</li>
              <li>• USCIS‑formatted export (PDF/CSV)</li>
              <li>• Free preview: partial timeline before purchase</li>
            </ul>
            <PlanButton href={lemon.basic}>Buy Basic</PlanButton>
          </div>

          {/* Standard */}
          <div className="rounded-xl border border-brand-primary/30 bg-white p-6 ring-2 ring-brand-primary/20">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">Standard</h3>
              <div className="text-2xl font-bold">$89</div>
            </div>
            <div className="inline-block text-xs font-semibold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded mt-2">Best Value</div>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>• Everything in Basic</li>
              <li>• Passport stamp OCR (up to 15 pages)</li>
              <li>• 2 inboxes (e.g., Gmail + O365)</li>
              <li>• Flight corroboration where available</li>
            </ul>
            <PlanButton href={lemon.standard}>Buy Standard</PlanButton>
          </div>

          {/* Premium */}
          <div className="rounded-xl border border-border-light bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">Premium</h3>
              <div className="text-2xl font-bold">$149</div>
            </div>
            <div className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded mt-2">Most Support</div>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>• Everything in Standard</li>
              <li>• Priority processing</li>
              <li>• Human QA on discrepancies (up to 10 items)</li>
              <li>• One re‑run within 30 days</li>
            </ul>
            <PlanButton href={lemon.premium}>Buy Premium</PlanButton>
          </div>
        </div>
        <p className="text-xs text-text-tertiary mt-3">Government filing fees not included. TravelCheck is not a law firm and does not provide legal advice.</p>
      </section>

      {/* Subscription */}
      <section id="subscription" className="mx-auto max-w-6xl px-6 pt-8 pb-4 scroll-mt-24">
        <h2 className="text-2xl font-semibold">Ongoing Tracking (Subscription)</h2>
        <p className="text-text-secondary mt-1">Continuous email sync, residency rules, alerts, and yearly exports.</p>
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="rounded-xl border border-border-light bg-white p-6">
            <h3 className="text-xl font-semibold">Personal</h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
              <span>$6.99/mo or $59/yr</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>• Continuous email sync and change detection</li>
              <li>• Rolling day‑count views (Schengen 90/180, custom)</li>
              <li>• 1 full immigration report per year</li>
              <li>• Alerts when nearing thresholds</li>
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <PlanButton href={lemon.personalMonthly}>Start Monthly</PlanButton>
              <PlanButton href={lemon.personalAnnual}>Start Annual</PlanButton>
            </div>
          </div>

          <div className="rounded-xl border border-border-light bg-white p-6">
            <h3 className="text-xl font-semibold">Family Add‑On</h3>
            <div className="mt-2 text-sm text-text-secondary">+ $4/mo</div>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>• Up to 3 profiles under one billing</li>
              <li>• Separate privacy controls per profile</li>
              <li>• Upgrade any time to Premium report</li>
            </ul>
            <PlanButton href="#" disabled>Add at checkout</PlanButton>
          </div>
        </div>
      </section>

      {/* Law Firms */}
      <section id="firms" className="mx-auto max-w-6xl px-6 pt-8 pb-4 scroll-mt-24">
        <h2 className="text-2xl font-semibold">For Law Firms</h2>
        <p className="text-text-secondary mt-1">Seat + report credits, audit trail, and client portals.</p>
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <div className="rounded-xl border border-border-light bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">Starter</h3>
              <div className="text-2xl font-bold">$79<span className="text-base font-normal text-text-secondary">/user/mo</span></div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>• 10 client report credits/month</li>
              <li>• Firm branding & shareable portals</li>
              <li>• Source provenance + audit trail</li>
            </ul>
            <PlanButton href={lemon.firmStarter}>Start Starter</PlanButton>
          </div>
          <div className="rounded-xl border border-brand-primary/30 bg-white p-6 ring-2 ring-brand-primary/20">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">Growth</h3>
              <div className="text-2xl font-bold">$129<span className="text-base font-normal text-text-secondary">/user/mo</span></div>
            </div>
            <div className="inline-block text-xs font-semibold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded mt-2">Best Value</div>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>• 30 report credits/month</li>
              <li>• Enhanced review tools & history</li>
              <li>• API access and SSO‑lite</li>
            </ul>
            <PlanButton href={lemon.firmGrowth}>Start Growth</PlanButton>
          </div>
          <div className="rounded-xl border border-border-light bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold">Scale</h3>
              <div className="text-2xl font-bold">$199<span className="text-base font-normal text-text-secondary">/user/mo</span></div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>• 100 report credits/month</li>
              <li>• Priority SLA, white‑label options</li>
              <li>• Advanced permissions & retention</li>
            </ul>
            <PlanButton href={lemon.firmScale}>Start Scale</PlanButton>
          </div>
        </div>
        <p className="text-sm text-text-secondary mt-3">Overage: $10–$20 per completed report (tier‑based). Volume discounts at 250/1,000+ reports. Enterprise available.</p>
      </section>

      {/* API Pricing */}
      <section id="api" className="mx-auto max-w-6xl px-6 pt-8 pb-4 scroll-mt-24">
        <h2 className="text-2xl font-semibold">API Pricing (Metered)</h2>
        <p className="text-text-secondary mt-1">Bill by OCR pages, parsed emails, trip segments, and reports.</p>
        <div className="mt-4 rounded-xl border border-border-light bg-white p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="font-semibold">Builder</div>
              <div className="text-sm text-text-secondary">$200/mo minimum</div>
              <ul className="mt-2 text-sm text-text-secondary space-y-1">
                <li>• OPU $0.18</li>
                <li>• EPU $0.003</li>
                <li>• TSU $0.008</li>
                <li>• RGU $2.00</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold">Growth</div>
              <div className="text-sm text-text-secondary">$1,000/mo minimum</div>
              <ul className="mt-2 text-sm text-text-secondary space-y-1">
                <li>• OPU $0.12</li>
                <li>• EPU $0.002</li>
                <li>• TSU $0.005</li>
                <li>• RGU $1.25</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold">Scale</div>
              <div className="text-sm text-text-secondary">$3,000/mo minimum</div>
              <ul className="mt-2 text-sm text-text-secondary space-y-1">
                <li>• OPU $0.08</li>
                <li>• EPU $0.001</li>
                <li>• TSU $0.003</li>
                <li>• RGU $0.90</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-text-tertiary mt-4">Committed‑use discounts; overage 15–30% above committed rates. Budget caps with 75/90/100% alerts and rate limits.</p>
        </div>
      </section>

      {/* Add-ons & FAQs */}
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-16">
        {/* Compare plans */}
        <div className="rounded-xl border border-border-light bg-white p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Compare one‑time report plans</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="font-medium">Feature</div>
            <div className="font-medium text-center">Basic</div>
            <div className="font-medium text-center">Standard</div>
            <div className="font-medium text-center">Premium</div>

            <div>Email import (inboxes)</div>
            <div className="text-center">1</div>
            <div className="text-center">2</div>
            <div className="text-center">2</div>

            <div>Passport OCR pages</div>
            <div className="text-center">—</div>
            <div className="text-center">Up to 15</div>
            <div className="text-center">Up to 15</div>

            <div>Flight corroboration</div>
            <div className="text-center">—</div>
            <div className="text-center">Included</div>
            <div className="text-center">Included</div>

            <div>Priority processing</div>
            <div className="text-center">—</div>
            <div className="text-center">—</div>
            <div className="text-center">Included</div>

            <div>Human QA</div>
            <div className="text-center">—</div>
            <div className="text-center">—</div>
            <div className="text-center">Up to 10 items</div>

            <div>Re‑run (30 days)</div>
            <div className="text-center">—</div>
            <div className="text-center">—</div>
            <div className="text-center">1 included</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold">Add‑Ons</h3>
            <ul className="mt-3 text-sm text-text-secondary space-y-2">
              <li>• Extra OCR pages: +$10 per +10 pages</li>
              <li>• Extra email inbox: +$10 per inbox</li>
              <li>• Expedited 24‑hour turnaround: +$29</li>
              <li>• Pro Human QA package: +$49 per report</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold">FAQs</h3>
            <ul className="mt-3 text-sm text-text-secondary space-y-3">
              <li>
                <div className="font-medium text-text-primary">What’s included in a “USCIS‑ready” report?</div>
                A formatted travel history covering 24+ hour trips over the requested period, with sources, confidence scores, and exportable PDF/CSV.
              </li>
              <li>
                <div className="font-medium text-text-primary">Do you guarantee USCIS acceptance?</div>
                We provide best‑effort reconstruction with provenance and an optional human QA. Acceptance depends on case facts.
              </li>
              <li>
                <div className="font-medium text-text-primary">How do you handle payments and tax?</div>
                Payments, tax, and invoicing are handled by Lemon Squeezy. Taxes shown at checkout.
              </li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-text-tertiary mt-8">Prices in USD; taxes may apply. Government fees not included.</p>
      </section>
    </div>
  )
}
