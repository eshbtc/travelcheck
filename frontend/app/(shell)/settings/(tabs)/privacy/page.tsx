'use client'

import React from 'react'
import { PrivacyControls, NotificationSettings } from '@/components/settings'

export default function PrivacySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Privacy & Notifications</h1>
        <p className="text-text-secondary">Manage your privacy settings and notification preferences</p>
      </div>
      
      <PrivacyControls />
      <NotificationSettings />
    </div>
  )
}
