import { ensureGurukulamFolders, findChildFile, listChildFiles, listChildRecordFilesAcrossDrive, readFile, writeJson, deleteFile } from './googleDrive';
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
const isChildRecordFile = (file: DriveFile) => /^CHD-[A-Z0-9]+\.json$/.test(file.name);

export async function loadChildrenFromDrive(token: string): Promise<DriveChildRecord[]> {
  const { childrenId } = await ensureGurukulamFolders(token);
  const localFiles = await listChildFiles(token, childrenId);
  const discoveredFiles = await listChildRecordFilesAcrossDrive(token);
  const childFiles = [...new Map([...localFiles, ...discoveredFiles].filter(isChildRecordFile).map(file => [file.id, file])).values()];
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
