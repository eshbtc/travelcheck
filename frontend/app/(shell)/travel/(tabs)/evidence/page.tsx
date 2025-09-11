'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { EvidenceList } from '@/components/travel/EvidenceList'
import { PassportScanCarousel } from '@/components/passport'
import { universalTravelService } from '@/services/universalService'
import { MockDataService } from '@/services/mockDataService'
import { BatchProcessingInterface } from '@/components/BatchProcessingInterface'
import { toast } from 'react-hot-toast'
import type { PresenceDay } from '@/types/universal'

export default function TravelEvidencePage() {
  const { user } = useAuth()
  const [presenceDays, setPresenceDays] = useState<PresenceDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadSummary, setUploadSummary] = useState<any | null>(null)

  const loadTravelData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load mock data immediately for development
      const mockData = await MockDataService.getPresenceDays()
      setPresenceDays(mockData)
      toast.success('Loaded sample travel data for demonstration')
      
      // Skip real API calls for now to avoid 500 errors
      // TODO: Re-enable when backend is properly configured
    } catch (error) {
      console.error('Error loading travel data:', error)
      toast.error('Failed to load travel data')
    } finally {
      setIsLoading(false)
    }
  }, [])

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
          toast.success(`Selected scan: ${scan.fileName || 'Unknown'}`)
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
