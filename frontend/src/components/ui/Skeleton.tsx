import React from 'react'
import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
  children?: React.ReactNode
}

export function Skeleton({ className, children }: SkeletonProps) {
  if (children) {
    return (
      <div className={cn('animate-pulse', className)}>
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-bg-secondary',
        className
      )}
    />
  )
}

// Pre-built skeleton components
export function SkeletonCard() {
  return (
    <div className="card p-6">
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function SkeletonTable() {
  return (
    <div className="card">
      <div className="card-header">
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="card-body space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/5" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonTimeline() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonCalendar() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}
