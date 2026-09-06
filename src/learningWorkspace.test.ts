import { describe, expect, it } from 'vitest';
import { defaultWorkspace, normalizeWorkspace } from './learningWorkspace';

describe('learning workspace normalization', () => {
  it('returns an empty workspace for invalid roots', () => {
    expect(normalizeWorkspace(null)).toEqual({});
    expect(normalizeWorkspace([])).toEqual({});
    expect(normalizeWorkspace('invalid')).toEqual({});
  });

  it('normalizes malformed persisted tests and homework instead of trusting raw objects', () => {
    const result = normalizeWorkspace({
      child1: {
        chapters: [{ id: 'c1', subject: 'Math', title: 'Fractions', pages: [] }],
        tests: [
          { title: '  Fractions  ', subject: 'Math', type: 'invalid', status: 'invalid', topics: '\u0000add and subtract' },
          { title: '', subject: 'Math' },
          ['not-an-object'],
        ],
        homework: [
          { title: '  Practice  ', subject: 'Math', status: 'invalid', instructions: '\u0001do it', dueDate: '2026-09-10' },
          { title: '', subject: 'Math' },
          ['not-an-object'],
        ],
      },
    });

    expect(result.child1.tests).toEqual([
      { id: expect.stringMatching(/^test-/), title: 'Fractions', subject: 'Math', date: '', type: 'Gurukulam', topics: 'add and subtract', status: 'Upcoming' },
    ]);
    expect(result.child1.homework).toEqual([
      { id: expect.stringMatching(/^homework-/), subject: 'Math', title: 'Practice', instructions: 'do it', dueDate: '2026-09-10', status: 'Pending' },
    ]);
  });

  it('keeps teaching plans scoped to real chapters and valid page selections', () => {
    const result = normalizeWorkspace({
      child1: {
        chapters: [{ id: 'c1', subject: 'Math', title: 'Fractions', pages: [] }],
        today: [
          { id: 'valid', subject: 'Math', topic: 'Parts', duration: 500, objective: 'Learn', completed: true, scope: 'pages', chapterId: 'c1', pageNumbers: [3, 1, 3, 0, -2] },
          { id: 'orphan', subject: 'Math', chapterId: 'missing', scope: 'full_chapter' },
          { id: 'invalid-pages', subject: 'Math', chapterId: 'c1', scope: 'pages', pageNumbers: [] },
        ],
      },
    });

    expect(result.child1.today).toEqual([
      { id: 'valid', subject: 'Math', topic: 'Parts', duration: 240, objective: 'Learn', completed: true, scope: 'pages', chapterId: 'c1', pageNumbers: [1, 3] },
    ]);
  });

  it('normalizes default subjects consistently', () => {
    expect(defaultWorkspace([' Math ', 'Math', '', 'Science'])).toEqual({
      teachers: [], subjects: ['Math', 'Science'], chapters: [], tests: [], today: [], homework: [],
    });
  });
});
