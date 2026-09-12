import { ensureGurukulamFolders, findNamedChildFile, readFile, writeJson, deleteFile, type DriveFile } from './googleDrive';
import type { ChildWorkspace, LearningProgress } from '../learningWorkspace';

const workspaceFileName = (childId: string) => `${childId}-learning-workspace.json`;
function validChildId(childId: string): boolean { return /^[A-Za-z0-9_-]{1,80}$/.test(childId); }

async function findWorkspaceFile(token: string, childrenFolderId: string, childId: string): Promise<DriveFile | null> {
  return findNamedChildFile(token, childrenFolderId, workspaceFileName(childId));
}

/** Merge progress snapshots so a stale parent-shell autosave cannot erase newer child learning data. */
export function mergeLearningProgress(existing: LearningProgress = {}, incoming: LearningProgress = {}): LearningProgress {
  const result: LearningProgress = { ...existing };
  for (const [key, incomingEntry] of Object.entries(incoming)) {
    const existingEntry = result[key];
    if (!existingEntry || incomingEntry.updatedAt >= existingEntry.updatedAt) {
      result[key] = incomingEntry;
    }
  }
  return result;
}

export async function loadLearningWorkspace(token: string, childId: string): Promise<ChildWorkspace | null> {
  if (!validChildId(childId)) throw new Error('Invalid child identifier.');
  const { childrenId } = await ensureGurukulamFolders(token);
  const file = await findWorkspaceFile(token, childrenId, childId);
  if (!file) return null;
  const value = await readFile<ChildWorkspace>(token, file.id);
  return value && typeof value === 'object' ? value : null;
}

export async function saveLearningWorkspace(token: string, childId: string, workspace: ChildWorkspace): Promise<DriveFile> {
  if (!validChildId(childId)) throw new Error('Invalid child identifier.');
  const { childrenId } = await ensureGurukulamFolders(token);
  const existing = await findWorkspaceFile(token, childrenId, childId);
  let workspaceToSave = workspace;

  if (existing) {
    const persisted = await readFile<ChildWorkspace>(token, existing.id);
    if (persisted && typeof persisted === 'object') {
      const existingProgress = persisted.learningProgress ?? {};
      const incomingProgress = workspace.learningProgress ?? {};
      workspaceToSave = { ...workspace, learningProgress: mergeLearningProgress(existingProgress, incomingProgress) };
    }
  }

  const serialized = JSON.stringify(workspaceToSave);
  if (serialized.length > 4_000_000) throw new Error('Learning workspace is too large to store safely. Upload fewer or smaller chapter documents.');
  return writeJson(token, childrenId, workspaceFileName(childId), workspaceToSave, existing?.id);
}

export async function removeLearningWorkspace(token: string, childId: string): Promise<void> {
  if (!validChildId(childId)) return;
  const { childrenId } = await ensureGurukulamFolders(token);
  const file = await findWorkspaceFile(token, childrenId, childId);
  if (file) await deleteFile(token, file.id);
}

export async function renameWorkspaceSubject(token: string, childId: string, previousSubject: string, nextSubject: string): Promise<void> {
  const workspace = await loadLearningWorkspace(token, childId);
  if (!workspace) return;
  const matches = (value: string) => value.localeCompare(previousSubject, undefined, { sensitivity: 'accent' }) === 0;
  await saveLearningWorkspace(token, childId, {
    ...workspace,
    subjects: workspace.subjects.map(value => matches(value) ? nextSubject : value),
    chapters: workspace.chapters.map(item => matches(item.subject) ? { ...item, subject: nextSubject } : item),
    teachers: workspace.teachers.map(item => ({ ...item, subjects: item.subjects.map(value => matches(value) ? nextSubject : value) })),
    tests: workspace.tests.map(item => matches(item.subject) ? { ...item, subject: nextSubject } : item),
    today: workspace.today.map(item => matches(item.subject) ? { ...item, subject: nextSubject } : item),
    homework: workspace.homework.map(item => matches(item.subject) ? { ...item, subject: nextSubject } : item),
  });
}

export async function deleteWorkspaceSubject(token: string, childId: string, subject: string): Promise<void> {
  const workspace = await loadLearningWorkspace(token, childId);
  if (!workspace) return;
  const matches = (value: string) => value.localeCompare(subject, undefined, { sensitivity: 'accent' }) === 0;
  const chapterIds = new Set(workspace.chapters.filter(item => matches(item.subject)).map(item => item.id));
  const learningProgress = Object.fromEntries(Object.entries(workspace.learningProgress || {}).filter(([, item]) => !matches(item.subject)));
  await saveLearningWorkspace(token, childId, {
    ...workspace,
    subjects: workspace.subjects.filter(value => !matches(value)),
    chapters: workspace.chapters.filter(item => !matches(item.subject)),
    teachers: workspace.teachers.map(item => ({ ...item, subjects: item.subjects.filter(value => !matches(value)) })).filter(item => item.subjects.length),
    tests: workspace.tests.filter(item => !matches(item.subject)),
    today: workspace.today.filter(item => !matches(item.subject) && !(item.chapterId && chapterIds.has(item.chapterId))),
    homework: workspace.homework.filter(item => !matches(item.subject)),
    learningProgress,
  });
}
