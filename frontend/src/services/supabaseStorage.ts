import { supabase } from '../lib/supabase'

export class SupabaseStorageService {
  private bucket = 'passport-scans' // Default bucket for passport scans

  /**
   * Upload file to Supabase storage
   */
  async uploadFile(
    file: File | Buffer, 
    path: string, 
    options?: {
      bucket?: string
      contentType?: string
      metadata?: Record<string, any>
    }
  ): Promise<{
    success: boolean
    data?: {
      url: string
      path: string
      fullPath: string
    }
    error?: string
  }> {
    try {
      const bucket = options?.bucket || this.bucket
      const contentType = options?.contentType || 'image/jpeg'


      let fileData: any
      if (file instanceof File) {
        fileData = file
      } else {
        // Convert Buffer to File-like object
        fileData = new Blob([file], { type: contentType })
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, fileData, {
          contentType,
          metadata: options?.metadata,
          upsert: true
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      return {
        success: true,
        data: {
          url: urlData.publicUrl,
          path: data.path,
          fullPath: data.fullPath
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  /**
   * Download file from Supabase storage
   */
  async downloadFile(
    path: string, 
    options?: { bucket?: string }
  ): Promise<{
    success: boolean
    data?: Blob
    error?: string
  }> {
    try {
      const bucket = options?.bucket || this.bucket

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path)

      if (error) {
        throw error
      }

      return {
        success: true,
        data
      }
    } catch (error) {
      console.error('Error downloading file:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      }
    }
  }

  /**
   * Delete file from Supabase storage
   */
  async deleteFile(
    path: string, 
    options?: { bucket?: string }
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const bucket = options?.bucket || this.bucket

      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting file:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      }
    }
  }

  /**
   * List files in storage bucket
   */
  async listFiles(
    folder?: string, 
    options?: { 
      bucket?: string
      limit?: number
      offset?: number 
    }
  ): Promise<{
    success: boolean
    data?: Array<{
      name: string
      id: string
      updated_at: string
      created_at: string
      last_accessed_at: string
      metadata: Record<string, any>
    }>
    error?: string
  }> {
    try {
      const bucket = options?.bucket || this.bucket

      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
          limit: options?.limit || 100,
          offset: options?.offset || 0
        })

      if (error) {
        throw error
      }

      return {
        success: true,
        data: data as any
      }
    } catch (error) {
      console.error('Error listing files:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'List failed'
      }
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(path: string, options?: { bucket?: string }): string {
    const bucket = options?.bucket || this.bucket
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  }

  /**
   * Create signed URL for temporary access
   */
  async createSignedUrl(
    path: string, 
    expiresIn: number = 3600, // 1 hour default
    options?: { bucket?: string }
  ): Promise<{
    success: boolean
    data?: {
      signedUrl: string
      path: string
      token: string
    }
    error?: string
  }> {
    try {
      const bucket = options?.bucket || this.bucket

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (error) {
        throw error
      }

      return {
        success: true,
        data: {
          signedUrl: data.signedUrl,
          path,
          token: ''
        }
      }
    } catch (error) {
      console.error('Error creating signed URL:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signed URL creation failed'
      }
    }
  }

  // Bucket provisioning is handled by database migrations; client assumes buckets exist

  /**
   * Upload multiple files in batch
   */
  async uploadBatch(files: Array<{
    file: File | Buffer
    path: string
    contentType?: string
    metadata?: Record<string, any>
  }>, options?: { bucket?: string }): Promise<{
    success: boolean
    results: Array<{
      path: string
      success: boolean
      url?: string
      error?: string
    }>
    summary: {
      total: number
      successful: number
      failed: number
    }
  }> {
    const results: any[] = []
    let successful = 0
    let failed = 0

    for (const fileInfo of files) {
      const result = await this.uploadFile(fileInfo.file, fileInfo.path, {
        bucket: options?.bucket,
        contentType: fileInfo.contentType,
        metadata: fileInfo.metadata
      })

      results.push({
        path: fileInfo.path,
        success: result.success,
        url: result.data?.url,
        error: result.error
      })

      if (result.success) {
        successful++
      } else {
        failed++
      }
    }

    return {
      success: true,
      results,
      summary: {
        total: files.length,
        successful,
        failed
      }
    }
  }
}

export const supabaseStorage = new SupabaseStorageService()
