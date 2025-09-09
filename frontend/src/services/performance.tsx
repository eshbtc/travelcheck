// Firebase Performance Monitoring service for tracking app performance metrics

import React from 'react';
import { getPerformance, trace } from 'firebase/performance'
import { getApp } from 'firebase/app'

// Performance service class
class PerformanceService {
  private performance: any = null
  private isInitialized = false
  private activeTraces: Map<string, any> = new Map()

  constructor() {
    this.initialize()
  }

  private initialize() {
    try {
      // Only initialize in browser environment
      if (typeof window !== 'undefined') {
        const app = getApp()
        this.performance = getPerformance(app)
        this.isInitialized = true
        console.log('Performance monitoring initialized successfully')
      }
    } catch (error) {
      console.warn('Performance monitoring initialization failed:', error)
    }
  }

  // Check if performance monitoring is available
  isAvailable(): boolean {
    return this.isInitialized && this.performance !== null
  }

  // Start a custom trace
  startTrace(traceName: string): any | null {
    if (!this.isAvailable()) return null

    try {
      const traceInstance = trace(this.performance, traceName)
      traceInstance.start()
      this.activeTraces.set(traceName, traceInstance)
      return traceInstance
    } catch (error) {
      console.warn('Failed to start trace:', error)
      return null
    }
  }

  // Stop a custom trace
  stopTrace(traceName: string): void {
    if (!this.isAvailable()) return

    try {
      const traceInstance = this.activeTraces.get(traceName)
      if (traceInstance) {
        traceInstance.stop()
        this.activeTraces.delete(traceName)
      }
    } catch (error) {
      console.warn('Failed to stop trace:', error)
    }
  }

  // Add metric to a trace
  addMetric(traceName: string, metricName: string, value: number): void {
    if (!this.isAvailable()) return

    try {
      const traceInstance = this.activeTraces.get(traceName)
      if (traceInstance) {
        traceInstance.putMetric(metricName, value)
      }
    } catch (error) {
      console.warn('Failed to add metric:', error)
    }
  }

  // Add attribute to a trace
  addAttribute(traceName: string, attributeName: string, value: string): void {
    if (!this.isAvailable()) return

    try {
      const traceInstance = this.activeTraces.get(traceName)
      if (traceInstance) {
        traceInstance.putAttribute(attributeName, value)
      }
    } catch (error) {
      console.warn('Failed to add attribute:', error)
    }
  }

  // Track page load performance
  trackPageLoad(pageName: string): void {
    if (!this.isAvailable()) return

    try {
      const traceInstance = this.startTrace(`page_load_${pageName}`)
      if (traceInstance) {
        traceInstance.putAttribute('page_name', pageName)
        
        // Track when page is fully loaded
        if (typeof window !== 'undefined') {
          window.addEventListener('load', () => {
            this.stopTrace(`page_load_${pageName}`)
          })
        }
      }
    } catch (error) {
      console.warn('Failed to track page load:', error)
    }
  }

  // Track API call performance
  trackApiCall(endpoint: string, method: string): { stop: (success: boolean, responseTime?: number) => void } {
    if (!this.isAvailable()) {
      return { stop: () => {} }
    }

    const traceName = `api_call_${method}_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`
    const startTime = performance.now()
    
    try {
      const traceInstance = this.startTrace(traceName)
      if (traceInstance) {
        traceInstance.putAttribute('endpoint', endpoint)
        traceInstance.putAttribute('method', method)
      }
    } catch (error) {
      console.warn('Failed to start API trace:', error)
    }

    return {
      stop: (success: boolean, responseTime?: number) => {
        try {
          const actualResponseTime = responseTime || (performance.now() - startTime)
          
          if (this.activeTraces.has(traceName)) {
            const traceInstance = this.activeTraces.get(traceName)
            if (traceInstance) {
              traceInstance.putAttribute('success', success.toString())
              traceInstance.putMetric('response_time', actualResponseTime)
              traceInstance.stop()
              this.activeTraces.delete(traceName)
            }
          }
        } catch (error) {
          console.warn('Failed to stop API trace:', error)
        }
      }
    }
  }

  // Track function call performance
  trackFunctionCall(functionName: string): { stop: (success: boolean, result?: any) => void } {
    if (!this.isAvailable()) {
      return { stop: () => {} }
    }

    const traceName = `function_call_${functionName}`
    const startTime = performance.now()
    
    try {
      const traceInstance = this.startTrace(traceName)
      if (traceInstance) {
        traceInstance.putAttribute('function_name', functionName)
      }
    } catch (error) {
      console.warn('Failed to start function trace:', error)
    }

    return {
      stop: (success: boolean, result?: any) => {
        try {
          const executionTime = performance.now() - startTime
          
          if (this.activeTraces.has(traceName)) {
            const traceInstance = this.activeTraces.get(traceName)
            if (traceInstance) {
              traceInstance.putAttribute('success', success.toString())
              traceInstance.putMetric('execution_time', executionTime)
              
              if (result && typeof result === 'object') {
                traceInstance.putAttribute('result_type', typeof result)
                if (result.size) {
                  traceInstance.putMetric('result_size', result.size)
                }
              }
              
              traceInstance.stop()
              this.activeTraces.delete(traceName)
            }
          }
        } catch (error) {
          console.warn('Failed to stop function trace:', error)
        }
      }
    }
  }

  // Track image processing performance
  trackImageProcessing(imageSize: number, processingType: 'ocr' | 'upload' | 'resize'): { stop: (success: boolean, processingTime?: number) => void } {
    if (!this.isAvailable()) {
      return { stop: () => {} }
    }

    const traceName = `image_processing_${processingType}`
    const startTime = performance.now()
    
    try {
      const traceInstance = this.startTrace(traceName)
      if (traceInstance) {
        traceInstance.putAttribute('processing_type', processingType)
        traceInstance.putMetric('image_size', imageSize)
      }
    } catch (error) {
      console.warn('Failed to start image processing trace:', error)
    }

    return {
      stop: (success: boolean, processingTime?: number) => {
        try {
          const actualProcessingTime = processingTime || (performance.now() - startTime)
          
          if (this.activeTraces.has(traceName)) {
            const traceInstance = this.activeTraces.get(traceName)
            if (traceInstance) {
              traceInstance.putAttribute('success', success.toString())
              traceInstance.putMetric('processing_time', actualProcessingTime)
              traceInstance.stop()
              this.activeTraces.delete(traceName)
            }
          }
        } catch (error) {
          console.warn('Failed to stop image processing trace:', error)
        }
      }
    }
  }

  // Track file upload performance
  trackFileUpload(fileName: string, fileSize: number): { stop: (success: boolean, uploadTime?: number) => void } {
    if (!this.isAvailable()) {
      return { stop: () => {} }
    }

    const traceName = `file_upload_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`
    const startTime = performance.now()
    
    try {
      const traceInstance = this.startTrace(traceName)
      if (traceInstance) {
        traceInstance.putAttribute('file_name', fileName)
        traceInstance.putMetric('file_size', fileSize)
      }
    } catch (error) {
      console.warn('Failed to start file upload trace:', error)
    }

    return {
      stop: (success: boolean, uploadTime?: number) => {
        try {
          const actualUploadTime = uploadTime || (performance.now() - startTime)
          
          if (this.activeTraces.has(traceName)) {
            const traceInstance = this.activeTraces.get(traceName)
            if (traceInstance) {
              traceInstance.putAttribute('success', success.toString())
              traceInstance.putMetric('upload_time', actualUploadTime)
              traceInstance.stop()
              this.activeTraces.delete(traceName)
            }
          }
        } catch (error) {
          console.warn('Failed to stop file upload trace:', error)
        }
      }
    }
  }

  // Track email sync performance
  trackEmailSync(provider: 'gmail' | 'office365'): { stop: (success: boolean, emailCount?: number, syncTime?: number) => void } {
    if (!this.isAvailable()) {
      return { stop: () => {} }
    }

    const traceName = `email_sync_${provider}`
    const startTime = performance.now()
    
    try {
      const traceInstance = this.startTrace(traceName)
      if (traceInstance) {
        traceInstance.putAttribute('provider', provider)
      }
    } catch (error) {
      console.warn('Failed to start email sync trace:', error)
    }

    return {
      stop: (success: boolean, emailCount?: number, syncTime?: number) => {
        try {
          const actualSyncTime = syncTime || (performance.now() - startTime)
          
          if (this.activeTraces.has(traceName)) {
            const traceInstance = this.activeTraces.get(traceName)
            if (traceInstance) {
              traceInstance.putAttribute('success', success.toString())
              traceInstance.putMetric('sync_time', actualSyncTime)
              
              if (emailCount !== undefined) {
                traceInstance.putMetric('email_count', emailCount)
              }
              
              traceInstance.stop()
              this.activeTraces.delete(traceName)
            }
          }
        } catch (error) {
          console.warn('Failed to stop email sync trace:', error)
        }
      }
    }
  }

  // Track report generation performance
  trackReportGeneration(reportType: 'uscis' | 'summary'): { stop: (success: boolean, entryCount?: number, generationTime?: number) => void } {
    if (!this.isAvailable()) {
      return { stop: () => {} }
    }

    const traceName = `report_generation_${reportType}`
    const startTime = performance.now()
    
    try {
      const traceInstance = this.startTrace(traceName)
      if (traceInstance) {
        traceInstance.putAttribute('report_type', reportType)
      }
    } catch (error) {
      console.warn('Failed to start report generation trace:', error)
    }

    return {
      stop: (success: boolean, entryCount?: number, generationTime?: number) => {
        try {
          const actualGenerationTime = generationTime || (performance.now() - startTime)
          
          if (this.activeTraces.has(traceName)) {
            const traceInstance = this.activeTraces.get(traceName)
            if (traceInstance) {
              traceInstance.putAttribute('success', success.toString())
              traceInstance.putMetric('generation_time', actualGenerationTime)
              
              if (entryCount !== undefined) {
                traceInstance.putMetric('entry_count', entryCount)
              }
              
              traceInstance.stop()
              this.activeTraces.delete(traceName)
            }
          }
        } catch (error) {
          console.warn('Failed to stop report generation trace:', error)
        }
      }
    }
  }

  // Get performance metrics
  getPerformanceMetrics(): Record<string, any> {
    if (!this.isAvailable()) return {}

    try {
      // This would typically involve querying Firebase Performance data
      // For now, we'll return basic information
      return {
        active_traces: this.activeTraces.size,
        is_available: this.isAvailable()
      }
    } catch (error) {
      console.warn('Failed to get performance metrics:', error)
      return {}
    }
  }

  // Clear all active traces
  clearActiveTraces(): void {
    try {
      this.activeTraces.forEach((trace, name) => {
        try {
          trace.stop()
        } catch (error) {
          console.warn(`Failed to stop trace ${name}:`, error)
        }
      })
      this.activeTraces.clear()
    } catch (error) {
      console.warn('Failed to clear active traces:', error)
    }
  }
}

// Create singleton instance
export const performanceService = new PerformanceService()

// Hook for using performance monitoring in React components
export function usePerformance() {
  return performanceService
}

// Higher-order component for automatic page load tracking
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  pageName: string
) {
  const WrappedComponent = (props: T) => {
    React.useEffect(() => {
      performanceService.trackPageLoad(pageName)
    }, [])

    return <Component {...props} />
  }

  WrappedComponent.displayName = `withPerformanceTracking(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Utility functions for common performance tracking patterns
export const performanceUtils = {
  // Track async function execution
  async trackAsyncFunction<T>(
    functionName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const tracker = performanceService.trackFunctionCall(functionName)
    
    try {
      const result = await fn()
      tracker.stop(true, result)
      return result
    } catch (error) {
      tracker.stop(false)
      throw error
    }
  },

  // Track API call
  async trackApiCall<T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const tracker = performanceService.trackApiCall(endpoint, method)
    
    try {
      const result = await apiCall()
      tracker.stop(true)
      return result
    } catch (error) {
      tracker.stop(false)
      throw error
    }
  },

  // Track image processing
  async trackImageProcessing<T>(
    imageSize: number,
    processingType: 'ocr' | 'upload' | 'resize',
    processingFunction: () => Promise<T>
  ): Promise<T> {
    const tracker = performanceService.trackImageProcessing(imageSize, processingType)
    
    try {
      const result = await processingFunction()
      tracker.stop(true)
      return result
    } catch (error) {
      tracker.stop(false)
      throw error
    }
  }
}
