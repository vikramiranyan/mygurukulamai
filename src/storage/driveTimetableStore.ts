import { ensureGurukulamFolders, listChildFiles, readFile, writeJson, type DriveFile } from './googleDrive';
import type { ParsedTimetablePeriod } from '../timetable/parser';

export type TimetablePeriodRecord = ParsedTimetablePeriod;

export type ChildTimetableRecord = {
  version: 1;
  childId: string;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  originalDriveFileId?: string;
  uploadedAt: string;
  status: 'uploaded' | 'reviewed' | 'confirmed';
  periods: TimetablePeriodRecord[];
  subjects: string[];
  audit: Array<{
    action: 'upload' | 'confirm' | 'add_subject' | 'modify_subject' | 'delete_subject';
    at: string;
    subject?: string;
    previousSubject?: string;
    newSubject?: string;
  }>;
};

const timetableFileName = (childId: string) => `${childId}-timetable.json`;

function normalizeSubject(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function uniqueSubjects(subjects: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of subjects) {
    const subject = normalizeSubject(raw);
    if (!subject) continue;
    const key = subject.toLocaleLowerCase();
    if (!seen.has(key)) seen.set(key, subject);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

async function findTimetableFile(token: string, childId: string): Promise<DriveFile | null> {
  const { childrenId } = await ensureGurukulamFolders(token);
  const files = await listChildFiles(token, childrenId);
  return files.find(file => file.name === timetableFileName(childId)) || null;
}

export async function loadChildTimetable(token: string, childId: string): Promise<ChildTimetableRecord | null> {
  const file = await findTimetableFile(token, childId);
  if (!file) return null;
  const record = await readFile<ChildTimetableRecord>(token, file.id);
  if (!record || record.version !== 1 || record.childId !== childId) return null;
  return {
    ...record,
    periods: Array.isArray(record.periods) ? record.periods : [],
    subjects: uniqueSubjects(Array.isArray(record.subjects) ? record.subjects : []),
    audit: Array.isArray(record.audit) ? record.audit : [],
  };
}

export async function saveChildTimetable(token: string, record: ChildTimetableRecord): Promise<ChildTimetableRecord> {
  if (!record.childId.trim()) throw new Error('A child must be selected before saving a timetable.');
  if (!record.periods.length) throw new Error('At least one timetable period is required.');
  const { childrenId } = await ensureGurukulamFolders(token);
  const existing = await findTimetableFile(token, record.childId);
  const safeRecord: ChildTimetableRecord = {
    ...record,
    childId: record.childId.trim(),
    subjects: uniqueSubjects(record.subjects),
    periods: record.periods.map(period => ({
      ...period,
      day: period.day.trim(),
      start: period.start.trim(),
      end: period.end.trim(),
      subject: normalizeSubject(period.subject),
    })),
  };
  await writeJson(token, childrenId, timetableFileName(safeRecord.childId), safeRecord, existing?.id);
  return safeRecord;
}

export async function updateChildSubjects(
  token: string,
  childId: string,
  subjects: string[],
  auditEntry: ChildTimetableRecord['audit'][number],
): Promise<ChildTimetableRecord> {
  const current = await loadChildTimetable(token, childId);
  if (!current) throw new Error('No confirmed timetable exists for this child yet.');
  const next = {
    ...current,
    subjects: uniqueSubjects(subjects),
    audit: [...current.audit, auditEntry],
  };
  await saveChildTimetable(token, next);
  return next;
}
