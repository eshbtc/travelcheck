'use client'

import React from 'react'
import { TravelHistoryViewer } from '@/components/travel/TravelHistoryViewer'

export default function TravelHistoryPage() {
  return (
    <div className="space-y-6">
      <TravelHistoryViewer
        onItemSelect={(item) => {
          console.log('Selected travel item:', item)
        }}
      />
    </div>
  )
}


