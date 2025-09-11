'use client'

import React, { useState, useEffect } from 'react'
import { MockDataService } from '@/services/mockDataService'
import { toast } from 'react-hot-toast'

export default function DebugMockPage() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const mockData = await MockDataService.getPresenceDays()
        setData(mockData)
        toast.success(`Loaded ${mockData.length} mock presence days`)
      } catch (error) {
        console.error('Error loading mock data:', error)
        toast.error('Failed to load mock data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Debug Mock Data</h1>
      
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <p className="mb-4">Loaded {data.length} presence days</p>
          <div className="space-y-2">
            {data.slice(0, 5).map((item, index) => (
              <div key={index} className="p-2 border rounded">
                <div>Date: {item.date}</div>
                <div>Country: {item.country}</div>
                <div>Confidence: {item.confidence}</div>
                <div>Evidence: {item.evidence.length} items</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


