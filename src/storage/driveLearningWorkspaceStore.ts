import { ensureGurukulamFolders, listChildFiles, readFile, writeJson, deleteFile, type DriveFile } from './googleDrive';
import type { ChildWorkspace } from '../learningWorkspace';

const workspaceFileName = (childId: string) => `${childId}-learning-workspace.json`;

function validChildId(childId: string): boolean {
  return /^[A-Za-z0-9_-]{1,80}$/.test(childId);
}

async function findWorkspaceFile(token: string, childrenFolderId: string, childId: string): Promise<DriveFile | null> {
  const files = await listChildFiles(token, childrenFolderId);
  return files.find(file => file.name === workspaceFileName(childId)) || null;
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
  const serialized = JSON.stringify(workspace);
  if (serialized.length > 4_000_000) throw new Error('Learning workspace is too large to store safely. Upload fewer or smaller chapter documents.');
  const { childrenId } = await ensureGurukulamFolders(token);
  const existing = await findWorkspaceFile(token, childrenId, childId);
  return writeJson(token, childrenId, workspaceFileName(childId), workspace, existing?.id);
}

export async function removeLearningWorkspace(token: string, childId: string): Promise<void> {
  if (!validChildId(childId)) return;
  const { childrenId } = await ensureGurukulamFolders(token);
  const file = await findWorkspaceFile(token, childrenId, childId);
  if (file) await deleteFile(token, file.id);
}
