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

const timetableFileName = (childId: string) => `${childId}-timetable.json`;

export async function loadChildrenFromDrive(token: string): Promise<DriveChildRecord[]> {
  const { childrenId } = await ensureGurukulamFolders(token);
  const files = await listChildFiles(token, childrenId);
  const childFiles = files.filter(file => file.name.endsWith('.json') && !file.name.endsWith('-timetable.json') && !file.name.endsWith('-learning-workspace.json'));
  const records = await Promise.all(childFiles.map(async file => {
    try {
      const record = await readFile<DriveChildRecord>(token, file.id);
      return record?.id && record?.name !== undefined ? record : null;
    } catch {
      return null;
    }
  }));
  return records.filter((record): record is DriveChildRecord => Boolean(record));
}

export async function saveChildToDrive(token: string, child: DriveChildRecord): Promise<DriveFile> {
  const { childrenId } = await ensureGurukulamFolders(token);
  const existing = await findChildFile(token, childrenId, child.id);
  return writeJson(token, childrenId, `${child.id}.json`, child, existing?.id);
}

export async function removeChildFromDrive(token: string, childId: string): Promise<void> {
  const { childrenId } = await ensureGurukulamFolders(token);
  const files = await listChildFiles(token, childrenId);
  const timetable = files.find(file => file.name === timetableFileName(childId));
  const child = await findChildFile(token, childrenId, childId);
  if (timetable) await deleteFile(token, timetable.id);
  if (child) await deleteFile(token, child.id);
}
