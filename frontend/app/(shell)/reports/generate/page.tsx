'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ReportForm } from '@/components/reports/ReportForm'
import { ReportPreview } from '@/components/reports/ReportPreview'
import { toast } from 'react-hot-toast'
import type { UniversalReport } from '@/types/universal'

export default function ReportGeneratePage() {
  const { user } = useAuth()
  const [generatedReport, setGeneratedReport] = useState<UniversalReport | null>(null)

  const handleReportGenerated = (report: UniversalReport) => {
    setGeneratedReport(report)
  }

  const handleExport = (format: 'json' | 'pdf') => {
    if (!generatedReport) return
    
    if (format === 'json') {
      const dataStr = JSON.stringify(generatedReport, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `report-${generatedReport.id}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Report exported as JSON')
    } else {
      toast.success('PDF export coming soon')
    }
  }

  const handleViewEvidence = (evidence: any) => {
    toast.success('Evidence viewer coming soon')
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generate Report</h1>
          <p className="text-gray-600">Please log in to generate reports</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Report</h1>
        <p className="text-gray-600">Create a new travel report for your application</p>
      </div>
      
      <ReportForm onReportGenerated={handleReportGenerated} />
      
      {generatedReport && (
        <ReportPreview
          report={generatedReport}
          onExport={handleExport}
          onViewEvidence={handleViewEvidence}
        />
      )}
    </div>
  )
}
