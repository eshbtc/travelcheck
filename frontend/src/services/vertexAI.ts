// Browser-compatible Vertex AI service using API routes
export class VertexAIService {
  constructor() {
    // Client-side service that makes API calls to our Next.js API routes
  }

  /**
   * Process passport image using Document AI API
   */
  async processPassportImage(imageData: Buffer | string): Promise<{
    success: boolean
    data?: {
      personalInfo: {
        firstName?: string
        lastName?: string
        nationality?: string
        dateOfBirth?: string
        passportNumber?: string
        issueDate?: string
        expiryDate?: string
      }
      stamps: Array<{
        country: string
        date: string
        type: 'entry' | 'exit'
        location?: string
        confidence: number
      }>
    }
    error?: string
  }> {
    try {
      // Convert image data to base64 if it's a Buffer
      const imageContent = Buffer.isBuffer(imageData) 
        ? imageData.toString('base64')
        : imageData

      // Make API call to our Next.js API route
      const response = await fetch('/api/ai/analyze-passport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageData: imageContent
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'API request failed')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error processing passport image:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Analyze travel patterns using API
   */
  async analyzeTravelPatterns(travelData: any[]): Promise<{
    success: boolean
    data?: {
      patterns: Array<{
        type: string
        description: string
        frequency: string
        countries: string[]
        recommendations: string[]
      }>
      insights: Array<{
        type: 'opportunity' | 'warning' | 'info'
        title: string
        description: string
        priority: 'high' | 'medium' | 'low'
      }>
    }
    error?: string
  }> {
    try {
      const response = await fetch('/api/ai/analyze-patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          travelData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'API request failed')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error analyzing travel patterns:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }
    }
  }

  /**
   * Generate smart suggestions using API
   */
  async generateSmartSuggestions(userData: any): Promise<{
    success: boolean
    data?: {
      suggestions: Array<{
        type: string
        title: string
        description: string
        priority: 'high' | 'medium' | 'low'
        action: string
      }>
      conflictingData?: Array<{
        type: string
        description: string
        items: any[]
        severity: 'low' | 'medium' | 'high'
      }>
      potentialGaps?: Array<{
        id: string
        start: string
        end: string
        confidence: number
        description: string
      }>
    }
    error?: string
  }> {
    try {
      const response = await fetch('/api/ai/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'API request failed')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error generating smart suggestions:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Suggestions generation failed'
      }
    }
  }

  /**
   * Detect duplicate scans - simplified implementation
   */
  async detectDuplicateScans(scans: Array<{
    id: string
    imageUrl: string
    metadata?: any
  }>): Promise<{
    success: boolean
    data?: Array<{
      id: string
      items: string[]
      confidence: number
      type: 'identical' | 'similar' | 'same_document'
    }>
    error?: string
  }> {
    try {
      // Simplified duplicate detection based on metadata/filenames
      const duplicates: any[] = []
      const seenHashes = new Map<string, string>()
      
      for (let i = 0; i < scans.length; i++) {
        for (let j = i + 1; j < scans.length; j++) {
          const scan1 = scans[i]
          const scan2 = scans[j]
          
          // Simple similarity check based on metadata or filename
          const similarity = this.calculateSimilarity(scan1, scan2)
          
          if (similarity > 0.8) {
            duplicates.push({
              id: `duplicate-${i}-${j}`,
              items: [scan1.id, scan2.id],
              confidence: similarity,
              type: similarity > 0.95 ? 'identical' : 'similar'
            })
          }
        }
      }

      return {
        success: true,
        data: duplicates
      }
    } catch (error) {
      console.error('Error detecting duplicate scans:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Duplicate detection failed'
      }
    }
  }

  private calculateSimilarity(scan1: any, scan2: any): number {
    // Simple similarity calculation
    // In production, you'd use actual image comparison algorithms
    let similarity = 0
    
    // Check filename similarity
    if (scan1.metadata?.fileName && scan2.metadata?.fileName) {
      const name1 = scan1.metadata.fileName.toLowerCase()
      const name2 = scan2.metadata.fileName.toLowerCase()
      if (name1 === name2) similarity += 0.5
      else if (name1.includes(name2) || name2.includes(name1)) similarity += 0.3
    }
    
    // Check URL similarity
    if (scan1.imageUrl && scan2.imageUrl) {
      if (scan1.imageUrl === scan2.imageUrl) similarity += 0.5
    }
    
    return similarity
  }

  /**
   * Process batch of passport images
   */
  async processBatchPassportImages(images: Array<{
    id: string
    data: Buffer | string
    fileName: string
  }>): Promise<{
    success: boolean
    processed: number
    failed: number
    results: Array<{
      id: string
      success: boolean
      data?: any
      error?: string
    }>
  }> {
    const results: any[] = []
    let processed = 0
    let failed = 0

    // Process images sequentially to avoid overwhelming the API
    for (const image of images) {
      try {
        const result = await this.processPassportImage(image.data)
        results.push({
          id: image.id,
          success: result.success,
          data: result.data,
          error: result.error
        })
        
        if (result.success) {
          processed++
        } else {
          failed++
        }
      } catch (error) {
        results.push({
          id: image.id,
          success: false,
          error: error instanceof Error ? error.message : 'Processing failed'
        })
        failed++
      }
    }

    return {
      success: true,
      processed,
      failed,
      results
    }
  }
}

export const vertexAI = new VertexAIService()