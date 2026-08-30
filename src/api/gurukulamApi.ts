export type ApiChild = {
  child_id: string;
  name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  grade?: string | null;
  section?: string | null;
  school_name?: string | null;
  school_board?: string | null;
};

export type ChildInput = Omit<ApiChild, 'child_id'>;

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export function isApiConfigured(): boolean {
  return Boolean(API_BASE_URL);
}

export function listChildren(accessToken: string): Promise<ApiChild[]> {
  return request<ApiChild[]>('/children', { headers: { Authorization: `Bearer ${accessToken}` } });
}

export function createChild(accessToken: string, child: ChildInput): Promise<ApiChild> {
  return request<ApiChild>('/children', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(child)
  });
}

export function updateChild(accessToken: string, childId: string, child: Partial<ChildInput>): Promise<ApiChild> {
  return request<ApiChild>(`/children/${encodeURIComponent(childId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(child)
  });
}

export function deleteChild(accessToken: string, childId: string): Promise<void> {
  return request<void>(`/children/${encodeURIComponent(childId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}
