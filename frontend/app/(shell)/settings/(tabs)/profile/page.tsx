'use client'

import React from 'react'
import { ProfileForm } from '@/components/settings'

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Profile Settings</h1>
        <p className="text-text-secondary">Manage your personal information</p>
      </div>
      
      <ProfileForm />
    </div>
  )
}
