import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  StorageService,
  UploadFileOptions,
  UploadResult,
  SignedUrlOptions,
  ListFilesOptions,
  FileMetadata,
  StorageError,
} from './types'

/**
 * Cloudflare R2 Storage Service
 *
 * Implements S3-compatible storage using Cloudflare R2.
 * Provides file upload, download, deletion, and signed URL generation.
 *
 * Environment variables required:
 * - R2_ACCOUNT_ID: Cloudflare account ID
 * - R2_ACCESS_KEY_ID: R2 API token access key
 * - R2_SECRET_ACCESS_KEY: R2 API token secret
 * - R2_BUCKET_NAME: R2 bucket name
 */

class R2StorageService implements StorageService {
  private client: S3Client
  private bucketName: string
  private publicUrl: string

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    this.bucketName = process.env.R2_BUCKET_NAME || ''

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new StorageError(
        'Missing R2 configuration. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME',
        'MISSING_CONFIG',
      )
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    // Public URL for R2 bucket (if using custom domain or R2.dev subdomain)
    this.publicUrl = process.env.R2_PUBLIC_URL || `https://${this.bucketName}.${accountId}.r2.dev`
  }

  /**
   * Upload a file to R2
   *
   * @param options - Upload configuration
   * @returns Upload result with public URL and metadata
   */
  async uploadFile(options: UploadFileOptions): Promise<UploadResult> {
    const { key, file, contentType, metadata } = options

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata,
      })

      await this.client.send(command)

      return {
        url: `${this.publicUrl}/${key}`,
        key,
        size: file.length,
      }
    } catch (error) {
      throw new StorageError(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_FAILED',
        500,
      )
    }
  }

  /**
   * Delete a file from R2
   *
   * @param key - File key to delete
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await this.client.send(command)
    } catch (error) {
      throw new StorageError(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_FAILED',
        500,
      )
    }
  }

  /**
   * Generate a presigned URL for private file access
   *
   * @param options - Signed URL configuration
   * @returns Presigned URL valid for specified duration
   */
  async getSignedUrl(options: SignedUrlOptions): Promise<string> {
    const { key, expiresIn = 3600 } = options // Default 1 hour

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const url = await getSignedUrl(this.client, command, { expiresIn })
      return url
    } catch (error) {
      throw new StorageError(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SIGNED_URL_FAILED',
        500,
      )
    }
  }

  /**
   * List files in the bucket
   *
   * @param options - List configuration
   * @returns Array of file metadata
   */
  async listFiles(options?: ListFilesOptions): Promise<FileMetadata[]> {
    const { prefix, limit = 1000, startAfter } = options || {}

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: limit,
        StartAfter: startAfter,
      })

      const response = await this.client.send(command)

      return (
        response.Contents?.map((item) => ({
          key: item.Key || '',
          size: item.Size || 0,
          lastModified: item.LastModified || new Date(),
          contentType: undefined, // Not available in list response
        })) || []
      )
    } catch (error) {
      throw new StorageError(
        `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LIST_FAILED',
        500,
      )
    }
  }

  /**
   * Check if a file exists
   *
   * @param key - File key to check
   * @returns True if file exists, false otherwise
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await this.client.send(command)
      return true
    } catch (error) {
      if ((error as { name?: string }).name === 'NotFound') {
        return false
      }
      throw new StorageError(
        `Failed to check file existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'HEAD_FAILED',
        500,
      )
    }
  }
}

// Export singleton instance
export const r2Storage = new R2StorageService()

// Export class for testing or custom instances
export { R2StorageService }
