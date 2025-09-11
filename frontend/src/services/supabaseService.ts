import { supabase } from '../lib/supabase'

// Auth helpers
export const authService = {
  signUp: async (email: string, password: string) => {
    return await supabase.auth.signUp({ email, password })
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password })
  },

  signOut: async () => {
    return await supabase.auth.signOut()
  },

  getUser: async () => {
    return await supabase.auth.getUser()
  },

  getSession: async () => {
    return await supabase.auth.getSession()
  },

  signInWithOAuth: async (provider: 'google' | 'github') => {
    return await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }
}

// API call helper that automatically includes auth token
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Replacement functions for Firebase Functions calls
export const supabaseService = {
  // User Management
  getUserProfile: async () => {
    return apiCall('/user/profile')
  },

  updateUserProfile: async (profileData: any) => {
    return apiCall('/user/profile', {
      method: 'POST',
      body: JSON.stringify({ profileData })
    })
  },

  // Travel History
  getTravelHistory: async () => {
    return apiCall('/travel/history')
  },

  saveTravelHistory: async (passportData: any, flightData: any) => {
    return apiCall('/travel/history', {
      method: 'POST',
      body: JSON.stringify({ passportData, flightData })
    })
  },

  // Passport Scans
  getPassportScans: async () => {
    return apiCall('/passport/scans')
  },

  savePassportScan: async (fileUrl: string, analysisResults: any, fileName?: string) => {
    return apiCall('/passport/scans', {
      method: 'POST',
      body: JSON.stringify({ fileUrl, analysisResults, fileName })
    })
  },

  deletePassportScan: async (scanId: string) => {
    return apiCall(`/passport/scans/${scanId}`, {
      method: 'DELETE'
    })
  },

  // Flight Emails
  getFlightEmails: async () => {
    return apiCall('/flight/emails')
  },

  deleteFlightEmail: async (emailId: string) => {
    return apiCall(`/flight/emails/${emailId}`, {
      method: 'DELETE'
    })
  },

  // System
  healthCheck: async () => {
    return apiCall('/health')
  },

  getSystemStatus: async () => {
    return apiCall('/system/status')
  },

  // Integration Status (to be implemented)
  getIntegrationStatus: async () => {
    return apiCall('/integration/status')
  },

  getBookingIngestionStatus: async () => {
    return apiCall('/booking/status')
  },

  // Admin functions (to be implemented)
  setUserRole: async (targetUserId: string, role: 'admin' | 'user') => {
    return apiCall('/admin/users/role', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, role })
    })
  },

  listUsers: async () => {
    return apiCall('/admin/users')
  }
}

// Real-time subscriptions (replacing Firebase Firestore listeners)
export const subscribeToUserData = (userId: string, callback: (data: any) => void) => {
  return supabase
    .channel(`user_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}

export const subscribeToPassportScans = (userId: string, callback: (data: any) => void) => {
  return supabase
    .channel(`passport_scans_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'passport_scans',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}