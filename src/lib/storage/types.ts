/**
 * Generic storage abstraction so the app is not coupled to a single cloud
 * storage backend. All uploads, downloads, file URLs and asset retrieval
 * flow through a `StorageProvider`.
 */

export interface StorageUploadResult {
  /** Provider-specific file identifier (Drive file ID / Box file ID). */
  fileId: string;
  /** Link suitable for "open in provider UI" / human viewing. */
  viewUrl: string;
  /** Link that returns the raw file bytes for download. */
  downloadUrl: string;
  /** Hotlinkable URL suitable for use as an <img>/model-viewer src. */
  publicUrl: string;
}

export interface DownloadedFile {
  buffer: Buffer;
  mimeType?: string;
}

export interface CreateUploadSessionParams {
  filename: string;
  mimeType: string;
  fileSize: number;
  /** Folder segments relative to the provider's root folder, e.g. [brandSlug, packSlug, assetType]. */
  folderPath: string[];
}

export interface UploadSession {
  /** URL the browser should PUT the raw file bytes to. */
  uploadUrl: string;
}

export interface RecoverUploadParams {
  filename: string;
  mimeType: string;
  folderPath: string[];
}

export type StorageProviderName = "google" | "box";

export interface StorageProvider {
  readonly providerName: StorageProviderName;

  /** Whether the provider has all required credentials configured. */
  isConfigured(): boolean;

  /** Root folder ID that all uploads are nested under. */
  getRootFolderId(): string;

  /** Finds (or creates) a folder named `name` under `parentId`. Returns its ID. */
  ensureFolder(name: string, parentId: string): Promise<string>;

  /** Finds a folder named `name` under `parentId`. Returns its ID, or null if not found. */
  findFolderByName(name: string, parentId: string): Promise<string | null>;

  /** Uploads a file buffer into the (auto-created) folder hierarchy under the root folder. */
  uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folderPath: string[]
  ): Promise<StorageUploadResult>;

  /** Downloads the raw bytes of a file. */
  downloadFile(fileId: string): Promise<DownloadedFile>;

  /** Permanently deletes a file. Returns false if it could not be deleted. */
  deleteFile(fileId: string): Promise<boolean>;

  /** Deletes a folder (and its contents) by name under `parentId`. Best-effort. */
  deleteFolderByName(
    name: string,
    parentId: string,
    forceDelete?: boolean
  ): Promise<boolean>;

  /** Hotlinkable public URL for a file (used for thumbnails/2D assets). */
  getPublicUrl(fileId: string): string;

  /**
   * Creates a session the browser can PUT raw file bytes to directly,
   * bypassing serverless body-size limits where possible.
   */
  createUploadSession(params: CreateUploadSessionParams): Promise<UploadSession>;

  /** Finalises an upload created via `createUploadSession`. */
  completeUpload(fileId: string): Promise<StorageUploadResult>;

  /**
   * Attempts to recover a file that was uploaded but whose ID was lost
   * client-side (e.g. due to a CORS response failure). Returns null if no
   * matching file could be found.
   */
  recoverUpload(params: RecoverUploadParams): Promise<StorageUploadResult | null>;
}
