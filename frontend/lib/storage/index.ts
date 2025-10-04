/**
 * Storage Module
 *
 * Exports storage services and types for use across the application.
 */

export { r2Storage, R2StorageService } from './r2'
export type {
  StorageService,
  UploadFileOptions,
  UploadResult,
  SignedUrlOptions,
  ListFilesOptions,
  FileMetadata,
} from './types'
export { StorageError } from './types'
