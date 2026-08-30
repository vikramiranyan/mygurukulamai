const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const APP_FOLDER = 'Gurukulam AI';
const CHILD_FOLDER = 'children';

export type DriveFile = { id: string; name: string; mimeType: string; parents?: string[] };

async function driveRequest<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) }
  });
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status})`);
  return response.json() as Promise<T>;
}

async function findFolder(token: string, name: string, parentId?: string): Promise<DriveFile | null> {
  const parent = parentId ? `'${parentId}' in parents and ` : '';
  const q = encodeURIComponent(`${parent}name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const data = await driveRequest<{ files: DriveFile[] }>(token, `${DRIVE_API}/files?q=${q}&fields=files(id,name,mimeType,parents)&spaces=drive`);
  return data.files[0] || null;
}

async function createFolder(token: string, name: string, parentId?: string): Promise<DriveFile> {
  return driveRequest<DriveFile>(token, `${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) })
  });
}

export async function ensureGurukulamFolders(token: string): Promise<{ rootId: string; childrenId: string }> {
  const root = await findFolder(token, APP_FOLDER) || await createFolder(token, APP_FOLDER);
  const children = await findFolder(token, CHILD_FOLDER, root.id) || await createFolder(token, CHILD_FOLDER, root.id);
  return { rootId: root.id, childrenId: children.id };
}

export async function findChildFile(token: string, childrenFolderId: string, childId: string): Promise<DriveFile | null> {
  const q = encodeURIComponent(`'${childrenFolderId}' in parents and name = '${childId}.json' and trashed = false`);
  const data = await driveRequest<{ files: DriveFile[] }>(token, `${DRIVE_API}/files?q=${q}&fields=files(id,name,mimeType,parents)&spaces=drive`);
  return data.files[0] || null;
}

export async function listChildFiles(token: string, childrenFolderId: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${childrenFolderId}' in parents and mimeType = 'application/json' and trashed = false`);
  const data = await driveRequest<{ files: DriveFile[] }>(token, `${DRIVE_API}/files?q=${q}&fields=files(id,name,mimeType,parents)&spaces=drive`);
  return data.files;
}

export async function readFile<T>(token: string, fileId: string): Promise<T> {
  return driveRequest<T>(token, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`);
}

export async function writeJson<T>(token: string, folderId: string, fileName: string, data: T, existingFileId?: string): Promise<DriveFile> {
  const body = JSON.stringify(data, null, 2);
  const metadata = JSON.stringify({ name: fileName, mimeType: 'application/json', ...(existingFileId ? {} : { parents: [folderId] }) });
  const url = existingFileId ? `${DRIVE_UPLOAD_API}/${encodeURIComponent(existingFileId)}?uploadType=multipart` : `${DRIVE_UPLOAD_API}?uploadType=multipart`;
  const boundary = `gurukulam-${crypto.randomUUID()}`;
  const payload = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--\r\n`], { type: `multipart/related; boundary=${boundary}` });
  return driveRequest<DriveFile>(token, url, { method: existingFileId ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: payload });
}

export async function deleteFile(token: string, fileId: string): Promise<void> {
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Google Drive delete failed (${response.status})`);
}
