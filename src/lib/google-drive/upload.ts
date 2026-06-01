import { Readable } from "stream";
import { getDriveClient } from "./client";

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

export async function ensureFolder(
  name: string,
  parentId: string
): Promise<string> {
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

/**
 * Permanently deletes a single Drive file. Returns true on success, false if
 * the file was already gone or the caller lacks permission (best-effort cleanup).
 */
export async function deleteFileFromDrive(driveId: string): Promise<boolean> {
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId: driveId });
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a Drive folder by name under a given parent.
 * Only deletes if the folder is empty or if forceDelete is true.
 * Best-effort — does not throw on failure.
 */
export async function deleteFolderByName(
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

export interface UploadResult {
  driveId: string;
  viewLink: string;
  downloadLink: string;
}

export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderPath: string[]
): Promise<UploadResult> {
  const drive = getDriveClient();

  // Resolve or create nested folder path
  let parentId = ROOT_FOLDER_ID;
  for (const segment of folderPath) {
    parentId = await ensureFolder(segment, parentId);
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

  const driveId = file.data.id!;

  // Make the file publicly readable (anyone with link)
  await drive.permissions.create({
    fileId: driveId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    driveId,
    viewLink: file.data.webViewLink ?? "",
    downloadLink: file.data.webContentLink ?? "",
  };
}
