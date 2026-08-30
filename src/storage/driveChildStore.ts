import { ensureGurukulamFolders, findChildFile, listChildFiles, readFile, writeJson, deleteFile } from './googleDrive';
import type { DriveFile } from './googleDrive';

export type DriveChildRecord = {
  id: string;
  name: string;
  dob: string;
  gender: string;
  grade: string;
  section: string;
  school: string;
  board: string;
};

export async function loadChildrenFromDrive(token: string): Promise<DriveChildRecord[]> {
  const { childrenId } = await ensureGurukulamFolders(token);
  const files = await listChildFiles(token, childrenId);
  const records: DriveChildRecord[] = [];
  for (const file of files) {
    try {
      const record = await readFile<DriveChildRecord>(token, file.id);
      if (record?.id && record?.name !== undefined) records.push(record);
    } catch {
      // Ignore malformed/unreadable records; the UI remains usable.
    }
  }
  return records;
}

export async function saveChildToDrive(token: string, child: DriveChildRecord): Promise<DriveFile> {
  const { childrenId } = await ensureGurukulamFolders(token);
  const existing = await findChildFile(token, childrenId, child.id);
  return writeJson(token, childrenId, `${child.id}.json`, child, existing?.id);
}

export async function removeChildFromDrive(token: string, childId: string): Promise<void> {
  const { childrenId } = await ensureGurukulamFolders(token);
  const existing = await findChildFile(token, childrenId, childId);
  if (existing) await deleteFile(token, existing.id);
}
