export type BackendSession = {
  access_token: string;
  token_type: 'bearer';
  expires_at: string;
  drive_access: boolean | null;
};

export type DriveAccessStatus = {
  drive_access: boolean | null;
  registry_configured: boolean;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) throw new Error('Gurukulam API is not configured');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function isAuthApiConfigured(): boolean {
  return Boolean(API_BASE_URL);
}

export function backendGoogleSignIn(credential: string): Promise<BackendSession> {
  return request<BackendSession>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}

export function getDriveAccessStatus(accessToken: string): Promise<DriveAccessStatus> {
  return request<DriveAccessStatus>('/auth/drive-access', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function updateDriveAccess(accessToken: string, driveAccess: boolean): Promise<DriveAccessStatus> {
  return request<DriveAccessStatus>('/auth/drive-access', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ drive_access: driveAccess }),
  });
}
