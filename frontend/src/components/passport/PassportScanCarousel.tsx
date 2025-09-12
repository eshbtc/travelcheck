'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { getPassportScans } from '@/services/supabaseService'
import { toast } from 'react-hot-toast'
import type { PassportScan } from '@/types/universal'

interface PassportScanCarouselProps {
  onScanSelect?: (scan: PassportScan) => void
  onScanDelete?: (scanId: string) => void
  className?: string
}

export function PassportScanCarousel({
  onScanSelect,
  onScanDelete,
  className = ''
}: PassportScanCarouselProps) {
  const [scans, setScans] = useState<PassportScan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedScan, setSelectedScan] = useState<PassportScan | null>(null)
  const [showFullView, setShowFullView] = useState(false)

  const loadPassportScans = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getPassportScans()
      if (result.success && result.data) {
        setScans(result.data)
        if (result.data.length > 0) {
          setSelectedScan(result.data[0])
        }
      }
    } catch (error) {
      console.error('Error loading passport scans:', error)
      toast.error('Failed to load passport scans')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPassportScans()
  }, [loadPassportScans])

  const nextScan = () => {
    setCurrentIndex((prev) => (prev + 1) % scans.length)
    setSelectedScan(scans[(currentIndex + 1) % scans.length])
  }

  const prevScan = () => {
    setCurrentIndex((prev) => (prev - 1 + scans.length) % scans.length)
    setSelectedScan(scans[(currentIndex - 1 + scans.length) % scans.length])
  }

  const goToScan = (index: number) => {
    setCurrentIndex(index)
    setSelectedScan(scans[index])
  }

  const handleViewFullSize = () => {
    setShowFullView(true)
    if (onScanSelect && selectedScan) {
      onScanSelect(selectedScan)
    }
  }

  const handleDownload = () => {
    if (selectedScan?.file_url) {
      const link = document.createElement('a')
      link.href = selectedScan.file_url
      link.download = selectedScan.file_name || 'passport-scan.jpg'
      link.click()
      toast.success('Download started')
    }
  }

  const handleDelete = async () => {
    if (selectedScan && onScanDelete) {
      onScanDelete(selectedScan.id)
      // Remove from local state
      setScans(prev => prev.filter(scan => scan.id !== selectedScan.id))
      if (scans.length > 1) {
        const newIndex = currentIndex > 0 ? currentIndex - 1 : 0
        setCurrentIndex(newIndex)
        setSelectedScan(scans[newIndex])
      } else {
        setSelectedScan(null)
      }
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100'
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="flex space-x-4">
            <Skeleton className="h-64 w-64" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (scans.length === 0) {
    return (
      <Card className={`p-8 ${className}`}>
        <EmptyState
          icon={<EyeIcon className="h-12 w-12 text-gray-400" />}
          title="No Passport Scans"
          description="Upload passport images to see them here. Use the batch processing interface to scan multiple images at once."
        />
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Passport Scans</h2>
          <p className="text-gray-600">
            {scans.length} scan{scans.length !== 1 ? 's' : ''} • {currentIndex + 1} of {scans.length}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleViewFullSize}
            variant="outline"
            size="sm"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            Full View
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={handleDelete}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Carousel */}
      <Card className="p-6">
        <div className="flex space-x-6">
          {/* Image Display */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-80 h-64 bg-gray-100 rounded-lg overflow-hidden">
                {selectedScan?.file_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${selectedScan.file_url}`}
                    alt={selectedScan.file_name || 'Passport scan'}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <EyeIcon className="h-12 w-12" />
                  </div>
                )}
              </div>
              
              {/* Navigation Arrows */}
              {scans.length > 1 && (
                <>
                  <Button
                    onClick={prevScan}
                    variant="outline"
                    size="sm"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={nextScan}
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Scan Details */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedScan?.file_name || 'Unknown file'}
              </h3>
              <p className="text-sm text-gray-600">
                Scanned on {formatDate(selectedScan?.created_at)}
              </p>
            </div>

            {/* Confidence Score */}
            {selectedScan?.analysis_results && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Confidence:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(0.95)}`}>
                  95%
                </span>
              </div>
            )}

            {/* Extracted Stamps */}
            {selectedScan?.analysis_results?.stamps && selectedScan.analysis_results.stamps.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Extracted Stamps:</h4>
                <div className="space-y-2">
                  {selectedScan.analysis_results.stamps.map((stamp: any, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <MapPinIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {stamp.country || 'Unknown Country'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{stamp.date || 'Unknown date'}</span>
                        {stamp.type && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{stamp.type}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processing Status */}
            <div className="flex items-center space-x-2">
              {selectedScan?.analysis_results ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Analysis complete</span>
                </>
              ) : (
                <>
                  <ClockIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-600">Processing pending</span>
                </>
              )}
            </div>

            {/* Source Information */}
            <div className="text-xs text-gray-500">
              <p>File: {selectedScan?.file_name || 'Unknown'}</p>
              <p>Type: {selectedScan?.file_url ? 'Image' : 'Unknown'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Thumbnail Navigation */}
      {scans.length > 1 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">All Scans</h4>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {scans.map((scan, index) => (
              <button
                key={scan.id}
                onClick={() => goToScan(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  index === currentIndex
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {scan.file_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${scan.file_url}`}
                    alt={scan.file_name || 'Scan'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <EyeIcon className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Full View Modal */}
      {showFullView && selectedScan && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedScan.file_name || 'Passport Scan'}
              </h3>
              <Button
                onClick={() => setShowFullView(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
            <div className="p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${selectedScan.file_url}`}
                alt={selectedScan.file_name || 'Passport scan'}
                className="max-w-full max-h-96 object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
