/**
 * Storage Service Types
 *
 * Common types used across storage implementations (R2, Supabase, etc.)
 */

export interface UploadFileOptions {
  key: string
  file: Buffer
  contentType: string
  metadata?: Record<string, string>
}

export interface UploadResult {
  url: string
  key: string
  size: number
}

export interface SignedUrlOptions {
  key: string
  expiresIn?: number // seconds
}

export interface ListFilesOptions {
  prefix?: string
  limit?: number
  startAfter?: string
}

export interface FileMetadata {
  key: string
  size: number
  lastModified: Date
  contentType?: string
  metadata?: Record<string, string>
}

export interface StorageService {
  uploadFile(options: UploadFileOptions): Promise<UploadResult>
  deleteFile(key: string): Promise<void>
  getSignedUrl(options: SignedUrlOptions): Promise<string>
  listFiles(options?: ListFilesOptions): Promise<FileMetadata[]>
  fileExists(key: string): Promise<boolean>
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'StorageError'
  }
}
