import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IntegrationService, type IntegrationStatus, type IngestParams, type IngestResult, type IngestStatus, type SchedulePreferences } from '@/services/integrationService'

// Query keys
export const integrationKeys = {
  all: ['integrations'] as const,
  status: () => [...integrationKeys.all, 'status'] as const,
  ingestionStatus: () => [...integrationKeys.all, 'ingestion-status'] as const,
  schedulePrefs: () => [...integrationKeys.all, 'schedule-prefs'] as const,
  gmailIngest: (params: IngestParams) => [...integrationKeys.all, 'gmail', 'ingest', params] as const,
  office365Ingest: (params: IngestParams) => [...integrationKeys.all, 'office365', 'ingest', params] as const,
}

// Integration Status Hook
export function useIntegrationStatus() {
  return useQuery({
    queryKey: integrationKeys.status(),
    queryFn: () => IntegrationService.getStatus(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  })
}

// Ingestion Status Hook
export function useIngestionStatus() {
  return useQuery({
    queryKey: integrationKeys.ingestionStatus(),
    queryFn: () => IntegrationService.getIngestionStatus(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  })
}

// Schedule Preferences Hook
export function useSchedulePreferences() {
  return useQuery({
    queryKey: integrationKeys.schedulePrefs(),
    queryFn: () => IntegrationService.getSchedulePrefs(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

// Gmail Ingestion Hook
export function useGmailIngestion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: IngestParams) => IntegrationService.ingestGmail(params),
    onSuccess: (result) => {
      // Invalidate and refetch ingestion status
      queryClient.invalidateQueries({ queryKey: integrationKeys.ingestionStatus() })
      
      // Optionally invalidate travel data if bookings were found
      if (result.bookingsFound > 0) {
        queryClient.invalidateQueries({ queryKey: ['travel'] })
        queryClient.invalidateQueries({ queryKey: ['reports'] })
      }
    },
  })
}

// Office 365 Ingestion Hook
export function useOffice365Ingestion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: IngestParams) => IntegrationService.ingestOffice365(params),
    onSuccess: (result) => {
      // Invalidate and refetch ingestion status
      queryClient.invalidateQueries({ queryKey: integrationKeys.ingestionStatus() })
      
      // Optionally invalidate travel data if bookings were found
      if (result.bookingsFound > 0) {
        queryClient.invalidateQueries({ queryKey: ['travel'] })
        queryClient.invalidateQueries({ queryKey: ['reports'] })
      }
    },
  })
}

// Schedule Preferences Update Hook
export function useUpdateSchedulePreferences() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (preferences: SchedulePreferences) => IntegrationService.updateSchedulePrefs(preferences),
    onSuccess: () => {
      // Invalidate and refetch schedule preferences
      queryClient.invalidateQueries({ queryKey: integrationKeys.schedulePrefs() })
    },
  })
}

// Gmail Connection Hook
export function useGmailConnection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => IntegrationService.connectGmail(),
    onSuccess: () => {
      // Invalidate integration status after successful connection
      queryClient.invalidateQueries({ queryKey: integrationKeys.status() })
    },
  })
}

// Office 365 Connection Hook
export function useOffice365Connection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => IntegrationService.connectOffice365(),
    onSuccess: () => {
      // Invalidate integration status after successful connection
      queryClient.invalidateQueries({ queryKey: integrationKeys.status() })
    },
  })
}

// Gmail Disconnection Hook
export function useGmailDisconnection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => IntegrationService.disconnectGmail(),
    onSuccess: () => {
      // Invalidate integration status after disconnection
      queryClient.invalidateQueries({ queryKey: integrationKeys.status() })
    },
  })
}

// Office 365 Disconnection Hook
export function useOffice365Disconnection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => IntegrationService.disconnectOffice365(),
    onSuccess: () => {
      // Invalidate integration status after disconnection
      queryClient.invalidateQueries({ queryKey: integrationKeys.status() })
    },
  })
}

// Combined Integration Hook
export function useIntegrations() {
  const integrationStatus = useIntegrationStatus()
  const ingestionStatus = useIngestionStatus()
  const schedulePrefs = useSchedulePreferences()
  
  const gmailConnection = useGmailConnection()
  const office365Connection = useOffice365Connection()
  const gmailDisconnection = useGmailDisconnection()
  const office365Disconnection = useOffice365Disconnection()
  
  const gmailIngestion = useGmailIngestion()
  const office365Ingestion = useOffice365Ingestion()
  const updateSchedulePrefs = useUpdateSchedulePreferences()
  
  return {
    // Data
    integrationStatus,
    ingestionStatus,
    schedulePrefs,
    
    // Connection actions
    connectGmail: gmailConnection.mutate,
    connectOffice365: office365Connection.mutate,
    disconnectGmail: gmailDisconnection.mutate,
    disconnectOffice365: office365Disconnection.mutate,
    
    // Ingestion actions
    ingestGmail: gmailIngestion.mutate,
    ingestOffice365: office365Ingestion.mutate,
    
    // Schedule actions
    updateSchedulePreferences: updateSchedulePrefs.mutate,
    
    // Loading states
    isLoading: integrationStatus.isLoading || ingestionStatus.isLoading || schedulePrefs.isLoading,
    isConnecting: gmailConnection.isPending || office365Connection.isPending,
    isDisconnecting: gmailDisconnection.isPending || office365Disconnection.isPending,
    isIngesting: gmailIngestion.isPending || office365Ingestion.isPending,
    isUpdatingSchedule: updateSchedulePrefs.isPending,
    
    // Error states
    error: integrationStatus.error || ingestionStatus.error || schedulePrefs.error,
    connectionError: gmailConnection.error || office365Connection.error,
    disconnectionError: gmailDisconnection.error || office365Disconnection.error,
    ingestionError: gmailIngestion.error || office365Ingestion.error,
    scheduleError: updateSchedulePrefs.error,
  }
}

// Utility hook for checking connection status
export function useConnectionStatus() {
  const { data: integrationStatus } = useIntegrationStatus()
  
  const gmailStatus = integrationStatus?.find(status => status.provider === 'gmail')
  const office365Status = integrationStatus?.find(status => status.provider === 'office365')
  
  return {
    isGmailConnected: gmailStatus?.isConnected || false,
    isOffice365Connected: office365Status?.isConnected || false,
    gmailStatus,
    office365Status,
    hasAnyConnection: (gmailStatus?.isConnected || false) || (office365Status?.isConnected || false),
  }
}

// Utility hook for ingestion readiness
export function useIngestionReadiness(selectedProviders: string[]) {
  const { isGmailConnected, isOffice365Connected } = useConnectionStatus()
  
  return {
    canIngestGmail: isGmailConnected && selectedProviders.length > 0,
    canIngestOffice365: isOffice365Connected && selectedProviders.length > 0,
    canIngestAny: (isGmailConnected || isOffice365Connected) && selectedProviders.length > 0,
    needsConnection: !isGmailConnected && !isOffice365Connected,
    needsProviders: selectedProviders.length === 0,
  }
}


