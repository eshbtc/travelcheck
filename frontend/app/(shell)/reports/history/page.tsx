'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ReportHistoryList } from '@/components/reports/ReportHistoryList'
import { ReportPreview } from '@/components/reports/ReportPreview'
import { toast } from 'react-hot-toast'
import type { UniversalReport } from '@/types/universal'
import { universalTravelService } from '@/services/universalService'

export default function ReportHistoryPage() {
  const { user } = useAuth()
  const [reports, setReports] = useState<UniversalReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<UniversalReport | null>(null)

  const loadReports = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const list = await universalTravelService.listUniversalReports(500)
      setReports(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Error loading reports:', error)
      toast.error('Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadReports()
    }
  }, [user, loadReports])

  const handleViewReport = (report: UniversalReport) => {
    setSelectedReport(report)
  }

  const handleExportReport = async (report: UniversalReport, format: 'json' | 'pdf') => {
    try {
      const result = await universalTravelService.exportReport({ reportId: report.id, format })
      if (result && result.downloadUrl) {
        const a = document.createElement('a')
        a.href = result.downloadUrl
        a.download = `report-${report.id}.${format === 'pdf' ? 'pdf' : 'json'}`
        a.click()
        toast.success(`Report exported as ${format.toUpperCase()}`)
      } else {
        throw new Error('No download available')
      }
    } catch (e) {
      toast.error('Failed to export report')
    }
  }

  const handleDeleteReport = async (report: UniversalReport) => {
    if (!confirm('Are you sure you want to delete this report?')) return
    try {
      const ok = await universalTravelService.deleteUniversalReport(report.id)
      if (ok) {
        setReports(prev => prev.filter(r => r.id !== report.id))
        if (selectedReport?.id === report.id) setSelectedReport(null)
        toast.success('Report deleted')
      } else {
        throw new Error('Delete failed')
      }
    } catch (e) {
      toast.error('Failed to delete report')
    }
  }

  const handleExport = (format: 'json' | 'pdf') => {
    if (!selectedReport) return
    handleExportReport(selectedReport, format)
  }

  const handleViewEvidence = (evidence: any) => {
    toast.success('Evidence viewer coming soon')
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report History</h1>
          <p className="text-gray-600">Please log in to view your reports</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report History</h1>
        <p className="text-gray-600">View and manage your previously generated reports</p>
      </div>
      
      <ReportHistoryList
        reports={reports}
        isLoading={isLoading}
        onViewReport={handleViewReport}
        onExportReport={handleExportReport}
        onDeleteReport={handleDeleteReport}
      />
      
      {selectedReport && (
        <ReportPreview
          report={selectedReport}
          onExport={handleExport}
          onViewEvidence={handleViewEvidence}
        />
      )}
    </div>
  )
}
