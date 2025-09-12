'use client'

import React, { useState, useEffect } from 'react'
import { EvidenceList } from '@/components/travel/EvidenceList'
import { PassportScanCarousel } from '@/components/passport'
import { BatchProcessingInterface } from '@/components/BatchProcessingInterface'
import { useTravelData } from '@/hooks/useTravelData'
import { toast } from 'react-hot-toast'

export default function TravelEvidencePage() {
  const { presenceDays, isLoading, loadTravelData } = useTravelData()
  const [uploadSummary, setUploadSummary] = useState<any | null>(null)


  useEffect(() => {
    loadTravelData()
  }, [loadTravelData])

  const handleViewEvidence = (evidence: any) => {
    toast.success('Evidence viewer coming soon')
  }

  const handleDownloadEvidence = (evidence: any) => {
    toast.success('Download functionality coming soon')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Evidence</h1>
        <p className="text-gray-600">Manage your travel evidence and documents</p>
      </div>
      
      {/* Batch Upload for Passport Images */}
      <BatchProcessingInterface onProcessingComplete={(result) => {
        // After processing, show summary and refresh evidence
        setUploadSummary(result)
        void loadTravelData()
      }} />

      {uploadSummary && (
        <div className="rounded-xl border border-border-light bg-bg-primary p-4 shadow-kaggle">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Upload Summary</h3>
              <p className="text-text-secondary text-sm">Processed: {uploadSummary.processed ?? 0} • Cached: {uploadSummary.cached ?? 0} • Duplicates: {uploadSummary.duplicatesCount ?? 0} • Errors: {uploadSummary.errorsCount ?? 0}</p>
            </div>
            <button
              onClick={() => setUploadSummary(null)}
              className="rounded-lg border border-border-light px-3 py-1 text-sm hover:bg-bg-secondary"
            >
              Dismiss
            </button>
          </div>
          {Array.isArray(uploadSummary.scans) && uploadSummary.scans.length > 0 && (
            <div className="mt-3 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Files:</span>
              <ul className="list-disc pl-5 mt-1">
                {uploadSummary.scans.slice(0, 5).map((s: any, i: number) => (
                  <li key={i}>{s.fileName || s.imageHash || 'scan'}</li>
                ))}
                {uploadSummary.scans.length > 5 && (
                  <li>…and {uploadSummary.scans.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Passport Scan Carousel */}
      <PassportScanCarousel
        onScanSelect={(scan) => {
          toast.success(`Selected scan: ${scan.file_name || 'Unknown'}`)
        }}
        onScanDelete={(scanId) => {
          toast.success(`Deleted scan: ${scanId}`)
        }}
      />
      
      <EvidenceList
        presenceDays={presenceDays}
        isLoading={isLoading}
        onViewEvidence={handleViewEvidence}
        onDownloadEvidence={handleDownloadEvidence}
      />
    </div>
  )
}
