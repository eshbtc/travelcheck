import React from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type DatabaseEvent = 'INSERT' | 'UPDATE' | 'DELETE'
export type TableName = 'passport_scans' | 'flight_emails' | 'travel_history' | 'reports' | 'duplicate_records'

export interface RealtimeSubscription {
  channel: RealtimeChannel
  unsubscribe: () => void
}

export class RealtimeService {
  private subscriptions = new Map<string, RealtimeChannel>()

  /**
   * Subscribe to changes on a specific table
   */
  subscribe<T extends { [key: string]: any } = any>(
    table: TableName,
    event: DatabaseEvent | '*',
    callback: (payload: RealtimePostgresChangesPayload<T>) => void,
    filter?: { column: string; value: string }
  ): RealtimeSubscription {
    const subscriptionId = `${table}_${event}_${Date.now()}`
    
    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` })
        } as any,
        callback as any
      )
      .subscribe()
    this.subscriptions.set(subscriptionId, channel)

    return {
      channel,
      unsubscribe: () => this.unsubscribe(subscriptionId)
    }
  }

  /**
   * Subscribe to passport scan changes for current user
   */
  subscribeToPassportScans(
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    userId?: string
  ): RealtimeSubscription {
    return this.subscribe(
      'passport_scans',
      '*',
      callback,
      userId ? { column: 'user_id', value: userId } : undefined
    )
  }

  /**
   * Subscribe to flight email changes for current user
   */
  subscribeToFlightEmails(
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    userId?: string
  ): RealtimeSubscription {
    return this.subscribe(
      'flight_emails',
      '*',
      callback,
      userId ? { column: 'user_id', value: userId } : undefined
    )
  }

  /**
   * Subscribe to travel history changes for current user
   */
  subscribeToTravelHistory(
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    userId?: string
  ): RealtimeSubscription {
    return this.subscribe(
      'travel_history',
      '*',
      callback,
      userId ? { column: 'user_id', value: userId } : undefined
    )
  }

  /**
   * Subscribe to report changes for current user
   */
  subscribeToReports(
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    userId?: string
  ): RealtimeSubscription {
    return this.subscribe(
      'reports',
      '*',
      callback,
      userId ? { column: 'user_id', value: userId } : undefined
    )
  }

  /**
   * Subscribe to duplicate record changes for current user
   */
  subscribeToDuplicateRecords(
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    userId?: string
  ): RealtimeSubscription {
    return this.subscribe(
      'duplicate_records',
      '*',
      callback,
      userId ? { column: 'user_id', value: userId } : undefined
    )
  }

  /**
   * Subscribe to all user-related changes
   */
  subscribeToUserData(
    userId: string,
    callbacks: {
      onPassportScanChange?: (payload: RealtimePostgresChangesPayload<any>) => void
      onFlightEmailChange?: (payload: RealtimePostgresChangesPayload<any>) => void
      onTravelHistoryChange?: (payload: RealtimePostgresChangesPayload<any>) => void
      onReportChange?: (payload: RealtimePostgresChangesPayload<any>) => void
      onDuplicateRecordChange?: (payload: RealtimePostgresChangesPayload<any>) => void
    }
  ): RealtimeSubscription[] {
    const subscriptions: RealtimeSubscription[] = []

    if (callbacks.onPassportScanChange) {
      subscriptions.push(
        this.subscribeToPassportScans(callbacks.onPassportScanChange, userId)
      )
    }

    if (callbacks.onFlightEmailChange) {
      subscriptions.push(
        this.subscribeToFlightEmails(callbacks.onFlightEmailChange, userId)
      )
    }

    if (callbacks.onTravelHistoryChange) {
      subscriptions.push(
        this.subscribeToTravelHistory(callbacks.onTravelHistoryChange, userId)
      )
    }

    if (callbacks.onReportChange) {
      subscriptions.push(
        this.subscribeToReports(callbacks.onReportChange, userId)
      )
    }

    if (callbacks.onDuplicateRecordChange) {
      subscriptions.push(
        this.subscribeToDuplicateRecords(callbacks.onDuplicateRecordChange, userId)
      )
    }

    return subscriptions
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): void {
    const channel = this.subscriptions.get(subscriptionId)
    if (channel) {
      supabase.removeChannel(channel)
      this.subscriptions.delete(subscriptionId)
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((channel, subscriptionId) => {
      supabase.removeChannel(channel)
    })
    this.subscriptions.clear()
  }

  /**
   * Get current subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size
  }

  /**
   * Check if a specific table subscription exists
   */
  hasSubscription(table: TableName): boolean {
    return Array.from(this.subscriptions.keys()).some(key => key.includes(table))
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService()

// React hook for easy usage in components
export function useRealtimeSubscription<T extends { [key: string]: any } = any>(
  table: TableName,
  event: DatabaseEvent | '*',
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  filter?: { column: string; value: string },
  enabled = true
) {
  const [subscription, setSubscription] = React.useState<RealtimeSubscription | null>(null)

  React.useEffect(() => {
    if (!enabled) return

    const sub = realtimeService.subscribe(table, event, callback, filter)
    setSubscription(sub)

    return () => {
      sub.unsubscribe()
      setSubscription(null)
    }
  }, [table, event, callback, filter, enabled])

  return subscription
}

// React hook for user-specific subscriptions
export function useUserRealtimeSubscriptions(
  userId: string,
  callbacks: {
    onPassportScanChange?: (payload: RealtimePostgresChangesPayload<any>) => void
    onFlightEmailChange?: (payload: RealtimePostgresChangesPayload<any>) => void
    onTravelHistoryChange?: (payload: RealtimePostgresChangesPayload<any>) => void
    onReportChange?: (payload: RealtimePostgresChangesPayload<any>) => void
    onDuplicateRecordChange?: (payload: RealtimePostgresChangesPayload<any>) => void
  },
  enabled = true
) {
  const [subscriptions, setSubscriptions] = React.useState<RealtimeSubscription[]>([])

  React.useEffect(() => {
    if (!enabled || !userId) return

    const subs = realtimeService.subscribeToUserData(userId, callbacks)
    setSubscriptions(subs)

    return () => {
      subs.forEach(sub => sub.unsubscribe())
      setSubscriptions([])
    }
  }, [userId, enabled, callbacks])

  return subscriptions
}

// Utility for processing realtime updates
export function processRealtimeUpdate<T extends { [key: string]: any }>(
  currentData: T[],
  payload: RealtimePostgresChangesPayload<T>,
  idField: keyof T = 'id' as keyof T
): T[] {
  const { eventType, new: newRecord, old: oldRecord } = payload

  switch (eventType) {
    case 'INSERT':
      if (newRecord) {
        return [...currentData, newRecord as T]
      }
      break

    case 'UPDATE':
      if (newRecord) {
        return currentData.map(item =>
          item[idField] === newRecord[idField] ? newRecord as T : item
        )
      }
      break

    case 'DELETE':
      if (oldRecord) {
        return currentData.filter(item => item[idField] !== oldRecord[idField])
      }
      break
  }

  return currentData
}

export default realtimeService