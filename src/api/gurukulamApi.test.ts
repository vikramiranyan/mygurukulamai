import { describe, expect, it, vi } from 'vitest';
import { isApiConfigured, listChildren } from './gurukulamApi';

describe('Gurukulam API client', () => {
  it('reports whether a production API base URL is configured', () => {
    expect(typeof isApiConfigured()).toBe('boolean');
  });

  it('sends the bearer token when listing children', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await listChildren('test-token');
    expect(fetchMock).toHaveBeenCalledWith('/children', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
    }));
  });
});
