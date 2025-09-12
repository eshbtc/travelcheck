// Mock Performance Monitoring service - Firebase removed, keeping interface for compatibility

import React from 'react';

// Mock Performance service class
class PerformanceService {
  private performance: any = null
  private isInitialized = true // Always true for mock
  private activeTraces: Map<string, any> = new Map()

  constructor() {
    console.log('Mock Performance monitoring initialized')
  }

  // Check if performance monitoring is available
  isAvailable(): boolean {
    return this.isInitialized
  }

  // Start a custom trace
  startTrace(traceName: string): any | null {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Performance: Start trace', traceName)
    }
    
    const mockTrace = {
      name: traceName,
      startTime: performance.now(),
      attributes: new Map<string, string>(),
      metrics: new Map<string, number>()
    }
    
    this.activeTraces.set(traceName, mockTrace)
    return mockTrace
  }

  // Stop a custom trace
  stopTrace(traceName: string): void {
    const traceInstance = this.activeTraces.get(traceName)
    if (traceInstance && process.env.NODE_ENV === 'development') {
      const duration = performance.now() - traceInstance.startTime
      console.log('Mock Performance: Stop trace', traceName, `${duration.toFixed(2)}ms`)
    }
    this.activeTraces.delete(traceName)
  }

  // Add metric to a trace
  addMetric(traceName: string, metricName: string, value: number): void {
    const traceInstance = this.activeTraces.get(traceName)
    if (traceInstance) {
      traceInstance.metrics.set(metricName, value)
      if (process.env.NODE_ENV === 'development') {
        console.log('Mock Performance: Add metric', traceName, metricName, value)
      }
    }
  }

  // Add attribute to a trace
  addAttribute(traceName: string, attributeName: string, value: string): void {
    const traceInstance = this.activeTraces.get(traceName)
    if (traceInstance) {
      traceInstance.attributes.set(attributeName, value)
      if (process.env.NODE_ENV === 'development') {
        console.log('Mock Performance: Add attribute', traceName, attributeName, value)
      }
    }
  }

  // Track page load performance
  trackPageLoad(pageName: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Performance: Track page load', pageName)
    }
    
    const traceInstance = this.startTrace(`page_load_${pageName}`)
    if (traceInstance) {
      this.addAttribute(`page_load_${pageName}`, 'page_name', pageName)
      
      // Mock completion after a short delay
      setTimeout(() => {
        this.stopTrace(`page_load_${pageName}`)
      }, 100)
    }
  }

  // Track API call performance
  trackApiCall(endpoint: string, method: string): { stop: (success: boolean, responseTime?: number) => void } {
    const traceName = `api_call_${method}_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`
    const startTime = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Performance: Track API call', method, endpoint)
    }
    
    const traceInstance = this.startTrace(traceName)
    if (traceInstance) {
      this.addAttribute(traceName, 'endpoint', endpoint)
      this.addAttribute(traceName, 'method', method)
    }

    return {
      stop: (success: boolean, responseTime?: number) => {
        const actualResponseTime = responseTime || (performance.now() - startTime)
        
        if (this.activeTraces.has(traceName)) {
          this.addAttribute(traceName, 'success', success.toString())
          this.addMetric(traceName, 'response_time', actualResponseTime)
          this.stopTrace(traceName)
        }
      }
    }
  }

  // Track function call performance
  trackFunctionCall(functionName: string): { stop: (success: boolean, result?: any) => void } {
    const traceName = `function_call_${functionName}`
    const startTime = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Performance: Track function call', functionName)
    }
    
    const traceInstance = this.startTrace(traceName)
    if (traceInstance) {
      this.addAttribute(traceName, 'function_name', functionName)
    }

    return {
      stop: (success: boolean, result?: any) => {
        const executionTime = performance.now() - startTime
        
        if (this.activeTraces.has(traceName)) {
          this.addAttribute(traceName, 'success', success.toString())
          this.addMetric(traceName, 'execution_time', executionTime)
          
          if (result && typeof result === 'object') {
            this.addAttribute(traceName, 'result_type', typeof result)
            if (result.size) {
              this.addMetric(traceName, 'result_size', result.size)
            }
          }
          
          this.stopTrace(traceName)
        }
      }
    }
  }

  // Track image processing performance
  trackImageProcessing(imageSize: number, processingType: 'ocr' | 'upload' | 'resize'): { stop: (success: boolean, processingTime?: number) => void } {
    const traceName = `image_processing_${processingType}`
    const startTime = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Performance: Track image processing', processingType, `${imageSize} bytes`)
    }
    
    const traceInstance = this.startTrace(traceName)
    if (traceInstance) {
      this.addAttribute(traceName, 'processing_type', processingType)
      this.addMetric(traceName, 'image_size', imageSize)
    }

    return {
      stop: (success: boolean, processingTime?: number) => {
        const actualProcessingTime = processingTime || (performance.now() - startTime)
        
        if (this.activeTraces.has(traceName)) {
          this.addAttribute(traceName, 'success', success.toString())
          this.addMetric(traceName, 'processing_time', actualProcessingTime)
          this.stopTrace(traceName)
        }
      }
    }
  }

  // Track file upload performance
  trackFileUpload(fileName: string, fileSize: number): { stop: (success: boolean, uploadTime?: number) => void } {
    const traceName = `file_upload_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`
    const startTime = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Performance: Track file upload', fileName, `${fileSize} bytes`)
    }
    
    const traceInstance = this.startTrace(traceName)
    if (traceInstance) {
      this.addAttribute(traceName, 'file_name', fileName)
      this.addMetric(traceName, 'file_size', fileSize)
    }

    return {
      stop: (success: boolean, uploadTime?: number) => {
        const actualUploadTime = uploadTime || (performance.now() - startTime)
        
        if (this.activeTraces.has(traceName)) {
          this.addAttribute(traceName, 'success', success.toString())
          this.addMetric(traceName, 'upload_time', actualUploadTime)
          this.stopTrace(traceName)
        }
      }
    }
  }

  // Track email sync performance
  trackEmailSync(provider: 'gmail' | 'office365'): { stop: (success: boolean, emailCount?: number, syncTime?: number) => void } {
    const traceName = `email_sync_${provider}`
    const startTime = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Performance: Track email sync', provider)
    }
    
    const traceInstance = this.startTrace(traceName)
    if (traceInstance) {
      this.addAttribute(traceName, 'provider', provider)
    }

    return {
      stop: (success: boolean, emailCount?: number, syncTime?: number) => {
        const actualSyncTime = syncTime || (performance.now() - startTime)
        
        if (this.activeTraces.has(traceName)) {
          this.addAttribute(traceName, 'success', success.toString())
          this.addMetric(traceName, 'sync_time', actualSyncTime)
          
          if (emailCount !== undefined) {
            this.addMetric(traceName, 'email_count', emailCount)
          }
          
          this.stopTrace(traceName)
        }
      }
    }
  }

  // Track report generation performance
  trackReportGeneration(reportType: 'uscis' | 'summary'): { stop: (success: boolean, entryCount?: number, generationTime?: number) => void } {
    const traceName = `report_generation_${reportType}`
    const startTime = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Performance: Track report generation', reportType)
    }
    
    const traceInstance = this.startTrace(traceName)
    if (traceInstance) {
      this.addAttribute(traceName, 'report_type', reportType)
    }

    return {
      stop: (success: boolean, entryCount?: number, generationTime?: number) => {
        const actualGenerationTime = generationTime || (performance.now() - startTime)
        
        if (this.activeTraces.has(traceName)) {
          this.addAttribute(traceName, 'success', success.toString())
          this.addMetric(traceName, 'generation_time', actualGenerationTime)
          
          if (entryCount !== undefined) {
            this.addMetric(traceName, 'entry_count', entryCount)
          }
          
          this.stopTrace(traceName)
        }
      }
    }
  }

  // Get performance metrics
  getPerformanceMetrics(): Record<string, any> {
    return {
      active_traces: this.activeTraces.size,
      is_available: this.isAvailable()
    }
  }

  // Clear all active traces
  clearActiveTraces(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mock Performance: Clear active traces', this.activeTraces.size)
    }
    this.activeTraces.clear()
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