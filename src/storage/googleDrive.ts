const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const APP_FOLDER = 'Gurukulam AI';
const CHILD_FOLDER = 'children';

export class DriveApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'DriveApiError';
  }
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
};

type DriveListResponse = {
  files: DriveFile[];
  nextPageToken?: string;
};

async function driveRequest<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json() as { error?: { message?: string; status?: string; errors?: Array<{ reason?: string; message?: string }> } };
      detail = body.error?.message || body.error?.status || body.error?.errors?.[0]?.reason || '';
    } catch {
      try {
        detail = (await response.text()).slice(0, 500);
      } catch {
        // Ignore secondary parsing failures.
      }
    }

    throw new DriveApiError(
      response.status,
      `Google Drive request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ''})${detail ? `: ${detail}` : ''}`,
    );
  }

  return response.json() as Promise<T>;
}

/** Authenticated Drive probe. A successful probe is the source of truth for access. */
export async function probeDriveAccess(token: string): Promise<void> {
  await driveRequest<{ user?: { permissionId?: string } }>(
    token,
    `${DRIVE_API}/about?fields=user(permissionId)`,
  );
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findFolder(token: string, name: string, parentId?: string): Promise<DriveFile | null> {
  const parent = parentId ? `'${escapeDriveQueryValue(parentId)}' in parents and ` : '';
  const q = encodeURIComponent(
    `${parent}name = '${escapeDriveQueryValue(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
  const data = await driveRequest<DriveListResponse>(
    token,
    `${DRIVE_API}/files?q=${q}&corpora=user&fields=files(id,name,mimeType,parents)&spaces=drive&pageSize=100`,
  );
  return data.files[0] || null;
}

async function createFolder(token: string, name: string, parentId?: string): Promise<DriveFile> {
  return driveRequest<DriveFile>(token, `${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
}

export async function ensureGurukulamFolders(token: string): Promise<{ rootId: string; childrenId: string }> {
  const root = (await findFolder(token, APP_FOLDER)) || (await createFolder(token, APP_FOLDER));
  const children = (await findFolder(token, CHILD_FOLDER, root.id)) || (await createFolder(token, CHILD_FOLDER, root.id));
  return { rootId: root.id, childrenId: children.id };
}

export async function findChildFile(token: string, childrenFolderId: string, childId: string): Promise<DriveFile | null> {
  const q = encodeURIComponent(
    `'${escapeDriveQueryValue(childrenFolderId)}' in parents and name = '${escapeDriveQueryValue(childId)}.json' and trashed = false`,
  );
  const data = await driveRequest<DriveListResponse>(
    token,
    `${DRIVE_API}/files?q=${q}&corpora=user&fields=files(id,name,mimeType,parents)&spaces=drive&pageSize=100`,
  );
  return data.files[0] || null;
}

export async function listChildFiles(token: string, childrenFolderId: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(
    `'${escapeDriveQueryValue(childrenFolderId)}' in parents and mimeType = 'application/json' and trashed = false`,
  );

  const files: DriveFile[] = [];
  let pageToken = '';

  do {
    const tokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const data = await driveRequest<DriveListResponse>(
      token,
      `${DRIVE_API}/files?q=${q}&corpora=user&fields=nextPageToken,files(id,name,mimeType,parents)&spaces=drive&pageSize=100${tokenParam}`,
    );
    files.push(...data.files);
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return files;
}

export async function readFile<T>(token: string, fileId: string): Promise<T> {
  return driveRequest<T>(token, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`);
}

export async function writeJson<T>(
  token: string,
  folderId: string,
  fileName: string,
  data: T,
  existingFileId?: string,
): Promise<DriveFile> {
  const body = JSON.stringify(data, null, 2);
  const metadata = JSON.stringify({
    name: fileName,
    mimeType: 'application/json',
    ...(existingFileId ? {} : { parents: [folderId] }),
  });
  const url = existingFileId
    ? `${DRIVE_UPLOAD_API}/${encodeURIComponent(existingFileId)}?uploadType=multipart`
    : `${DRIVE_UPLOAD_API}?uploadType=multipart`;
  const boundary = `gurukulam-${crypto.randomUUID()}`;
  const payload = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n` +
        `--${boundary}--\r\n`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );

  return driveRequest<DriveFile>(token, url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: payload,
  });
}

export async function deleteFile(token: string, fileId: string): Promise<void> {
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json() as { error?: { message?: string; status?: string } };
      detail = body.error?.message || body.error?.status || '';
    } catch {
      try {
        detail = (await response.text()).slice(0, 500);
      } catch {
        // Ignore secondary parsing failures.
      }
    }
    throw new DriveApiError( response.status, `Google Drive delete failed (${response.status})${detail ? `: ${detail}` : ''}` );
  }
}
