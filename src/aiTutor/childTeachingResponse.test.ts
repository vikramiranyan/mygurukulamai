import { describe, expect, it } from 'vitest';
import { buildChildTeachingResponse } from './childTeachingResponse';

describe('child teaching response', () => {
  it('teaches numbers 1 to 10 instead of echoing the request', () => {
    const response = buildChildTeachingResponse('Teach me numbers upto 10');
    expect(response).not.toBeNull();
    expect(response?.title).toContain('numbers 1 to 10');
    expect(response?.body).toContain('1 — one');
    expect(response?.body).toContain('10 — ten');
    expect(response?.checks).toContain('What number comes after 5?');
    expect(response?.body).not.toContain('Let’s explore “Teach me numbers upto 10”');
  });

  it('recognises common variants of the same request', () => {
    expect(buildChildTeachingResponse('teach me numbers up to 10')).not.toBeNull();
    expect(buildChildTeachingResponse('Teach me counting 1 to 10')).not.toBeNull();
  });
});
