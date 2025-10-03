import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * S3-compatible storage service
 * Works with Railway Minio, Cloudflare R2, AWS S3, or any S3-compatible service
 */
class StorageService {
  private client: S3Client
  private bucket: string
  private publicUrl: string

  constructor() {
    // Support both Minio (Railway) and R2 (Cloudflare) configurations
    const endpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY
    const region = process.env.S3_REGION || 'auto'
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Storage credentials not configured. Please set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables.')
    }

    this.bucket = process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'travel-check-uploads'
    this.publicUrl = process.env.S3_PUBLIC_URL || process.env.R2_PUBLIC_URL || ''

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle, // Required for Minio
    })
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    })

    await this.client.send(command)

    const url = this.getPublicUrl(key)
    return { key, url }
  }

  /**
   * Get a file from storage
   */
  async getFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    const response = await this.client.send(command)
    const stream = response.Body as any
    const chunks: Uint8Array[] = []

    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    return Buffer.concat(chunks)
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    await this.client.send(command)
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
      await this.client.send(command)
      return true
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false
      }
      throw error
    }
  }

  /**
   * Get a signed URL for temporary access (1 hour expiry)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    return getSignedUrl(this.client, command, { expiresIn })
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${this.bucket}/${key}`
    }
    // Fallback for Minio without public URL configured
    return `http://localhost:9000/${this.bucket}/${key}`
  }

  /**
   * Generate a unique key for passport images
   */
  generatePassportKey(userId: string, filename: string): string {
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `passports/${userId}/${timestamp}-${sanitizedFilename}`
  }

  /**
   * Generate a unique key for documents
   */
  generateDocumentKey(userId: string, type: string, filename: string): string {
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `documents/${userId}/${type}/${timestamp}-${sanitizedFilename}`
  }
}

// Export singleton instance
export const storageService = new StorageService()
