import { describe, expect, it } from 'vitest';
import { buildChildTeachingResponse } from './childTeachingResponse';

describe('child teaching responses', () => {
  it('actually teaches numbers through 10 instead of echoing the request', () => {
    const result = buildChildTeachingResponse('Teach me numbers upto 10');
    expect(result?.body).toContain('1 — one');
    expect(result?.body).toContain('10 — ten');
    expect(result?.checks[0]).toContain('after 5');
  });
});
