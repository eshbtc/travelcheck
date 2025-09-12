"use client"

import React, { useMemo, useState } from 'react'

export default function CostCalculatorPage() {
  // Defaults are order-of-magnitude placeholders. Adjust based on telemetry.
  const [ocrCostPerPage, setOcrCostPerPage] = useState(0.10)
  const [ocrPages, setOcrPages] = useState(15)

  const [emailCostPer, setEmailCostPer] = useState(0.003)
  const [emails, setEmails] = useState(120)

  const [segmentCostPer, setSegmentCostPer] = useState(0.005)
  const [segments, setSegments] = useState(45)

  const [llmCostPerReport, setLlmCostPerReport] = useState(0.50)
  const [flightCostPerLookup, setFlightCostPerLookup] = useState(0.01)
  const [flightLookups, setFlightLookups] = useState(10)

  const [fixedOpsPerReport, setFixedOpsPerReport] = useState(0.10) // storage/monitoring/egress
  const [sellingPrice, setSellingPrice] = useState(89) // e.g., Standard

  const cogs = useMemo(() => {
    const ocr = ocrCostPerPage * ocrPages
    const em = emailCostPer * emails
    const seg = segmentCostPer * segments
    const llm = llmCostPerReport
    const flight = flightCostPerLookup * flightLookups
    const fixed = fixedOpsPerReport
    return +(ocr + em + seg + llm + flight + fixed).toFixed(4)
  }, [ocrCostPerPage, ocrPages, emailCostPer, emails, segmentCostPer, segments, llmCostPerReport, flightCostPerLookup, flightLookups, fixedOpsPerReport])

  const margin = useMemo(() => {
    const m = sellingPrice - cogs
    const pct = sellingPrice > 0 ? (m / sellingPrice) * 100 : 0
    return { m: +m.toFixed(2), pct: +pct.toFixed(1) }
  }, [sellingPrice, cogs])

  return (
    <div>
      <h1 className="text-2xl font-semibold">Unit Economics Calculator</h1>
      <p className="text-text-secondary mt-1">Estimate per‑report COGS and margin. Use your telemetry to refine defaults.</p>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="rounded-xl border border-border-light bg-white p-5 lg:col-span-2">
          <div className="grid md:grid-cols-2 gap-4">
            {/* OCR */}
            <div className="rounded-lg border border-border-light p-4">
              <div className="font-medium">OCR</div>
              <div className="mt-3 flex items-center gap-3">
                <label className="text-sm w-40">Cost per page ($)</label>
                <input type="number" step="0.001" className="input"
                  value={ocrCostPerPage}
                  onChange={e => setOcrCostPerPage(parseFloat(e.target.value || '0'))} />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm w-40">Pages per report</label>
                <input type="number" className="input"
                  value={ocrPages}
                  onChange={e => setOcrPages(parseInt(e.target.value || '0'))} />
              </div>
            </div>

            {/* Emails */}
            <div className="rounded-lg border border-border-light p-4">
              <div className="font-medium">Email Parsing</div>
              <div className="mt-3 flex items-center gap-3">
                <label className="text-sm w-40">Cost per email ($)</label>
                <input type="number" step="0.001" className="input"
                  value={emailCostPer}
                  onChange={e => setEmailCostPer(parseFloat(e.target.value || '0'))} />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm w-40">Emails per report</label>
                <input type="number" className="input"
                  value={emails}
                  onChange={e => setEmails(parseInt(e.target.value || '0'))} />
              </div>
            </div>

            {/* Segments */}
            <div className="rounded-lg border border-border-light p-4">
              <div className="font-medium">Trip Segments</div>
              <div className="mt-3 flex items-center gap-3">
                <label className="text-sm w-40">Cost per segment ($)</label>
                <input type="number" step="0.001" className="input"
                  value={segmentCostPer}
                  onChange={e => setSegmentCostPer(parseFloat(e.target.value || '0'))} />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm w-40">Segments per report</label>
                <input type="number" className="input"
                  value={segments}
                  onChange={e => setSegments(parseInt(e.target.value || '0'))} />
              </div>
            </div>

            {/* LLM / Flights */}
            <div className="rounded-lg border border-border-light p-4">
              <div className="font-medium">LLM & Flight Enrichment</div>
              <div className="mt-3 flex items-center gap-3">
                <label className="text-sm w-40">LLM cost per report ($)</label>
                <input type="number" step="0.01" className="input"
                  value={llmCostPerReport}
                  onChange={e => setLlmCostPerReport(parseFloat(e.target.value || '0'))} />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm w-40">Flight cost per lookup ($)</label>
                <input type="number" step="0.001" className="input"
                  value={flightCostPerLookup}
                  onChange={e => setFlightCostPerLookup(parseFloat(e.target.value || '0'))} />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm w-40">Lookups per report</label>
                <input type="number" className="input"
                  value={flightLookups}
                  onChange={e => setFlightLookups(parseInt(e.target.value || '0'))} />
              </div>
            </div>

            {/* Fixed ops & price */}
            <div className="rounded-lg border border-border-light p-4">
              <div className="font-medium">Fixed & Price</div>
              <div className="mt-3 flex items-center gap-3">
                <label className="text-sm w-40">Fixed ops per report ($)</label>
                <input type="number" step="0.01" className="input"
                  value={fixedOpsPerReport}
                  onChange={e => setFixedOpsPerReport(parseFloat(e.target.value || '0'))} />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm w-40">Selling price ($)</label>
                <input type="number" step="1" className="input"
                  value={sellingPrice}
                  onChange={e => setSellingPrice(parseFloat(e.target.value || '0'))} />
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-border-light bg-white p-5">
          <div className="text-lg font-semibold">Summary</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>COGS per report</span><span className="font-medium">${cogs.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Selling price</span><span className="font-medium">${sellingPrice.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Gross margin</span><span className={`font-medium ${margin.pct >= 70 ? 'text-green-600' : margin.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>${margin.m.toFixed(2)} ({margin.pct.toFixed(1)}%)</span></div>
          </div>
          <p className="text-xs text-text-tertiary mt-3">Tip: tune email‑first extraction, gate OCR on low confidence, and cache flight lookups to reduce COGS.</p>
        </div>
      </div>

      <style jsx global>{`
        .input { height: 40px; width: 140px; padding: 0 10px; border: 1px solid var(--color-border-light); border-radius: 6px; background: white; }
      `}</style>
    </div>
  )
}

