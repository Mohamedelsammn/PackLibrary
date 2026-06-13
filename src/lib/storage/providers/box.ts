import type {
  CreateUploadSessionParams,
  DownloadedFile,
  RecoverUploadParams,
  StorageProvider,
  StorageUploadResult,
  UploadSession,
} from "../types";

const BOX_API_BASE = "https://api.box.com/2.0";
const BOX_UPLOAD_BASE = "https://upload.box.com/api/2.0";
const BOX_TOKEN_URL = "https://api.box.com/oauth2/token";
export const BOX_AUTHORIZE_URL = "https://account.box.com/api/oauth2/authorize";

interface BoxTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

interface BoxItem {
  id: string;
  name: string;
  type: "file" | "folder";
}

interface BoxItemsResponse {
  entries: BoxItem[];
}

interface BoxConflictResponse {
  context_info?: {
    conflicts?: { id: string } | { id: string }[];
  };
}

// Box rotates the refresh token on every use. We cache the latest
// access/refresh token pair in memory for the lifetime of the server
// process so we don't burn through BOX_REFRESH_TOKEN on every request.
// On a cold start we fall back to BOX_REFRESH_TOKEN from the environment.
let tokenCache: { accessToken: string; expiresAt: number; refreshToken: string } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.BOX_CLIENT_ID;
  const clientSecret = process.env.BOX_CLIENT_SECRET;
  const refreshToken = tokenCache?.refreshToken ?? process.env.BOX_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "BOX_CLIENT_ID, BOX_CLIENT_SECRET and BOX_REFRESH_TOKEN must be set"
    );
  }

  const res = await fetch(BOX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Box token refresh failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as BoxTokenResponse;

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
    refreshToken: data.refresh_token,
  };

  return tokenCache.accessToken;
}

async function boxFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${BOX_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

function firstConflictId(data: BoxConflictResponse): string | undefined {
  const conflicts = data.context_info?.conflicts;
  if (!conflicts) return undefined;
  return Array.isArray(conflicts) ? conflicts[0]?.id : conflicts.id;
}

/** Exchanges an OAuth authorization code for an access/refresh token pair. */
export async function exchangeBoxAuthorizationCode(
  code: string,
  redirectUri: string
): Promise<BoxTokenResponse> {
  const clientId = process.env.BOX_CLIENT_ID;
  const clientSecret = process.env.BOX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("BOX_CLIENT_ID and BOX_CLIENT_SECRET must be set");
  }

  const res = await fetch(BOX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Box token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return (await res.json()) as BoxTokenResponse;
}

export class BoxProvider implements StorageProvider {
  readonly providerName = "box" as const;

  isConfigured(): boolean {
    return !!(
      process.env.BOX_CLIENT_ID &&
      process.env.BOX_CLIENT_SECRET &&
      process.env.BOX_REFRESH_TOKEN &&
      process.env.BOX_ROOT_FOLDER_ID
    );
  }

  getRootFolderId(): string {
    const rootFolderId = process.env.BOX_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      throw new Error("BOX_ROOT_FOLDER_ID is not configured");
    }
    return rootFolderId;
  }

  async findFolderByName(name: string, parentId: string): Promise<string | null> {
    const res = await boxFetch(`/folders/${parentId}/items?fields=id,name,type&limit=1000`);
    if (!res.ok) {
      throw new Error(`Box folder listing failed (${res.status})`);
    }
    const data = (await res.json()) as BoxItemsResponse;
    const match = data.entries.find((e) => e.type === "folder" && e.name === name);
    return match?.id ?? null;
  }

  async ensureFolder(name: string, parentId: string): Promise<string> {
    const existing = await this.findFolderByName(name, parentId);
    if (existing) return existing;

    const res = await boxFetch("/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parent: { id: parentId } }),
    });

    if (res.ok) {
      const data = (await res.json()) as { id: string };
      return data.id;
    }

    if (res.status === 409) {
      const data = (await res.json()) as BoxConflictResponse;
      const conflictId = firstConflictId(data);
      if (conflictId) return conflictId;
    }

    const text = await res.text().catch(() => "");
    throw new Error(`Box folder creation failed (${res.status}): ${text.slice(0, 200)}`);
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folderPath: string[]
  ): Promise<StorageUploadResult> {
    let parentId = this.getRootFolderId();
    for (const segment of folderPath) {
      parentId = await this.ensureFolder(segment, parentId);
    }

    const token = await getAccessToken();

    const form = new FormData();
    form.append("attributes", JSON.stringify({ name: fileName, parent: { id: parentId } }));
    form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), fileName);

    let res = await fetch(`${BOX_UPLOAD_BASE}/files/content`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    let fileId: string;

    if (res.ok) {
      const data = (await res.json()) as { entries: { id: string }[] };
      fileId = data.entries[0].id;
    } else if (res.status === 409) {
      const data = (await res.json()) as BoxConflictResponse;
      const existingId = firstConflictId(data);
      if (!existingId) {
        throw new Error("Box upload conflict did not include an existing file ID");
      }

      const versionForm = new FormData();
      versionForm.append("attributes", JSON.stringify({ name: fileName }));
      versionForm.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), fileName);

      res = await fetch(`${BOX_UPLOAD_BASE}/files/${existingId}/content`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: versionForm,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Box version upload failed (${res.status}): ${text.slice(0, 200)}`);
      }

      const versionData = (await res.json()) as { entries: { id: string }[] };
      fileId = versionData.entries[0].id;
    } else {
      const text = await res.text().catch(() => "");
      throw new Error(`Box upload failed (${res.status}): ${text.slice(0, 200)}`);
    }

    return {
      fileId,
      viewUrl: `https://app.box.com/file/${fileId}`,
      downloadUrl: this.getPublicUrl(fileId),
      publicUrl: this.getPublicUrl(fileId),
    };
  }

  async downloadFile(fileId: string): Promise<DownloadedFile> {
    const token = await getAccessToken();
    const res = await fetch(`${BOX_API_BASE}/files/${fileId}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Box download failed (${res.status})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: res.headers.get("content-type") ?? undefined,
    };
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const res = await boxFetch(`/files/${fileId}`, { method: "DELETE" });
      return res.ok || res.status === 404;
    } catch {
      return false;
    }
  }

  async deleteFolderByName(
    name: string,
    parentId: string,
    forceDelete = true
  ): Promise<boolean> {
    try {
      const folderId = await this.findFolderByName(name, parentId);
      if (!folderId) return true; // already gone
      if (!forceDelete) return false;
      const res = await boxFetch(`/folders/${folderId}?recursive=true`, { method: "DELETE" });
      return res.ok || res.status === 404;
    } catch {
      return false;
    }
  }

  getPublicUrl(fileId: string): string {
    return `/api/download/${fileId}`;
  }

  async createUploadSession(params: CreateUploadSessionParams): Promise<UploadSession> {
    const { filename, mimeType, folderPath } = params;
    const query = new URLSearchParams({
      filename,
      mimeType,
      folder: folderPath.join("/"),
    });
    return { uploadUrl: `/api/upload/relay?${query.toString()}` };
  }

  async completeUpload(fileId: string): Promise<StorageUploadResult> {
    const res = await boxFetch(`/files/${fileId}?fields=id,name`);
    if (!res.ok) {
      throw new Error(`Box file lookup failed (${res.status})`);
    }

    return {
      fileId,
      viewUrl: `https://app.box.com/file/${fileId}`,
      downloadUrl: this.getPublicUrl(fileId),
      publicUrl: this.getPublicUrl(fileId),
    };
  }

  async recoverUpload(_params: RecoverUploadParams): Promise<StorageUploadResult | null> {
    // The Box upload flow proxies through /api/upload/relay (same-origin),
    // so there is no CORS failure mode that would lose the file ID.
    return null;
  }
}
