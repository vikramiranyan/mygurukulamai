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
      teachers: [], subjects: ['Math', 'Science'], chapters: [], tests: [], today: [], homework: [], learningProgress: {},
    });
  });

  it('stores teacher gender for selecting the teaching voice', () => {
    const result = normalizeWorkspace({
      child: {
        subjects: ['English'],
        teachers: [
          { id: 'teacher-1', name: 'Arun', subjects: ['English'], voiceGender: 'male', voiceLanguage: 'English', enabled: true },
          { id: 'teacher-2', name: 'Legacy', subjects: ['English'], enabled: true },
        ],
      },
    });

    expect(result.child.teachers.map(teacher => teacher.voiceGender)).toEqual(['male', 'female']);
  });

  it('removes legacy AI book lookup placeholder chapters', () => {
    const result = normalizeWorkspace({
      child: {
        chapters: [{
          id: 'junk',
          subject: 'English',
          title: 'My Family',
          fileName: 'AI book lookup · SMILE English 1 Coursebook',
          uploadedAt: '',
          pages: [{ number: 1, text: 'placeholder' }],
        }],
      },
    });
    expect(result.child.chapters).toEqual([]);
  });

  it('requires newly uploaded chapters to be confirmed while preserving legacy chapters', () => {
    const result = normalizeWorkspace({
      child: {
        chapters: [
          { id: 'pending', subject: 'Math', title: 'Fractions', reviewStatus: 'review_required', pages: [{ number: 1, text: 'Parts of a whole' }] },
          { id: 'legacy', subject: 'Math', title: 'Numbers', pages: [{ number: 1, text: 'Counting' }] },
        ],
      },
    });

    expect(result.child.chapters.map(chapter => chapter.reviewStatus)).toEqual(['review_required', 'confirmed']);
  });
});
