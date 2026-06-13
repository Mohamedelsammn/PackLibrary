import type { StorageProvider, StorageProviderName } from "./types";
import { GoogleDriveProvider } from "./providers/google-drive";
import { BoxProvider } from "./providers/box";

export type { StorageProvider, StorageProviderName } from "./types";
export type {
  StorageUploadResult,
  DownloadedFile,
  CreateUploadSessionParams,
  UploadSession,
  RecoverUploadParams,
} from "./types";

let cachedProvider: StorageProvider | undefined;

export function getStorageProviderName(): StorageProviderName {
  const value = (process.env.STORAGE_PROVIDER ?? "google").trim().toLowerCase();
  return value === "box" ? "box" : "google";
}

/** Returns the configured storage provider, selected via `STORAGE_PROVIDER`. */
export function getStorageProvider(): StorageProvider {
  if (cachedProvider) return cachedProvider;

  cachedProvider =
    getStorageProviderName() === "box" ? new BoxProvider() : new GoogleDriveProvider();

  return cachedProvider;
}
