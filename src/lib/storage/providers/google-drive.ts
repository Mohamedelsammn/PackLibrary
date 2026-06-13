import { google } from "googleapis";
import { Readable } from "stream";
import type {
  CreateUploadSessionParams,
  DownloadedFile,
  RecoverUploadParams,
  StorageProvider,
  StorageUploadResult,
  UploadSession,
} from "../types";

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set"
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (refreshToken) {
    auth.setCredentials({ refresh_token: refreshToken });
  }

  return auth;
}

/** Exposed for the Google OAuth setup/callback routes. */
export function getGoogleOAuthClient() {
  return getOAuth2Client();
}

function getDriveClient() {
  const auth = getOAuth2Client();
  return google.drive({ version: "v3", auth });
}

export class GoogleDriveProvider implements StorageProvider {
  readonly providerName = "google" as const;

  isConfigured(): boolean {
    return !!(
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN
    );
  }

  getRootFolderId(): string {
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!rootFolderId) {
      throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured");
    }
    return rootFolderId;
  }

  async ensureFolder(name: string, parentId: string): Promise<string> {
    const drive = getDriveClient();

    const res = await drive.files.list({
      q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    const folder = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
    });

    return folder.data.id!;
  }

  async findFolderByName(name: string, parentId: string): Promise<string | null> {
    const drive = getDriveClient();
    const res = await drive.files.list({
      q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
    });
    return res.data.files?.[0]?.id ?? null;
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folderPath: string[]
  ): Promise<StorageUploadResult> {
    const drive = getDriveClient();

    let parentId = this.getRootFolderId();
    for (const segment of folderPath) {
      parentId = await this.ensureFolder(segment, parentId);
    }

    const stream = Readable.from(buffer);

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id, webViewLink, webContentLink",
    });

    const fileId = file.data.id!;

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return {
      fileId,
      viewUrl: file.data.webViewLink ?? "",
      downloadUrl: file.data.webContentLink ?? "",
      publicUrl: this.getPublicUrl(fileId),
    };
  }

  async downloadFile(fileId: string): Promise<DownloadedFile> {
    const drive = getDriveClient();
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    const stream = res.data as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    return { buffer: Buffer.concat(chunks) };
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const drive = getDriveClient();
      await drive.files.delete({ fileId });
      return true;
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
      const drive = getDriveClient();
      const res = await drive.files.list({
        q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id)",
      });
      const folderId = res.data.files?.[0]?.id;
      if (!folderId) return true; // already gone
      if (forceDelete) {
        await drive.files.delete({ fileId: folderId });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getPublicUrl(fileId: string): string {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  async createUploadSession(params: CreateUploadSessionParams): Promise<UploadSession> {
    const { filename, mimeType, fileSize, folderPath } = params;

    let parentId = this.getRootFolderId();
    for (const segment of folderPath) {
      parentId = await this.ensureFolder(segment, parentId);
    }

    const auth = getOAuth2Client();
    const { token } = await auth.getAccessToken();

    if (!token) {
      throw new Error("Could not obtain Google access token");
    }

    const initResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": fileSize.toString(),
        },
        body: JSON.stringify({
          name: filename,
          parents: [parentId],
        }),
      }
    );

    if (!initResponse.ok) {
      const text = await initResponse.text().catch(() => "");
      throw new Error(
        `Google Drive returned ${initResponse.status}: ${text.slice(0, 200)}`
      );
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("Google Drive did not return a session URI");
    }

    return { uploadUrl };
  }

  async completeUpload(fileId: string): Promise<StorageUploadResult> {
    const drive = getDriveClient();

    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    const file = await drive.files.get({
      fileId,
      fields: "id,webViewLink,webContentLink",
    });

    return {
      fileId,
      viewUrl: file.data.webViewLink ?? "",
      downloadUrl: file.data.webContentLink ?? "",
      publicUrl: this.getPublicUrl(fileId),
    };
  }

  async recoverUpload(params: RecoverUploadParams): Promise<StorageUploadResult | null> {
    const { filename, folderPath } = params;
    const drive = getDriveClient();

    let parentId = this.getRootFolderId();
    for (const segment of folderPath) {
      parentId = await this.ensureFolder(segment, parentId);
    }

    const listRes = await drive.files.list({
      q: `name='${filename.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`,
      fields: "files(id,webViewLink,webContentLink,mimeType)",
      orderBy: "createdTime desc",
      pageSize: 1,
    });

    const file = listRes.data.files?.[0];
    if (!file?.id) return null;

    try {
      await drive.permissions.create({
        fileId: file.id,
        requestBody: { role: "reader", type: "anyone" },
      });
    } catch {
      // Permissions may already be set — not fatal
    }

    const meta = await drive.files.get({
      fileId: file.id,
      fields: "id,webViewLink,webContentLink",
    });

    return {
      fileId: meta.data.id!,
      viewUrl: meta.data.webViewLink ?? "",
      downloadUrl: meta.data.webContentLink ?? "",
      publicUrl: this.getPublicUrl(meta.data.id!),
    };
  }
}
