export type ChildRecord = {
  child_id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  grade: string | null;
  section: string | null;
  school_name: string | null;
  school_board: string | null;
  created_at: string;
  updated_at: string;
};

export type ChildInput = Omit<
  ChildRecord,
  'child_id' | 'created_at' | 'updated_at'
>;

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path: string): string {
  return `${API_BASE_URL}/api${path}`;
}

async function request<T>(path: string, options: RequestInit = {}, accessToken?: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Gurukulam API request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function signInWithGoogleCredential(credential: string) {
  return request<{ access_token: string; token_type: string; expires_at: string }>(
    '/auth/google',
    { method: 'POST', body: JSON.stringify({ credential }) },
  );
}

export function listChildren(accessToken: string) {
  return request<ChildRecord[]>('/children', {}, accessToken);
}

export function createChild(accessToken: string, child: ChildInput) {
  return request<ChildRecord>('/children', { method: 'POST', body: JSON.stringify(child) }, accessToken);
}

export function updateChild(accessToken: string, childId: string, child: Partial<ChildInput>) {
  return request<ChildRecord>(`/children/${encodeURIComponent(childId)}`, {
    method: 'PATCH',
    body: JSON.stringify(child),
  }, accessToken);
}

export function deleteChild(accessToken: string, childId: string) {
  return request<void>(`/children/${encodeURIComponent(childId)}`, {
    method: 'DELETE',
  }, accessToken);
}
