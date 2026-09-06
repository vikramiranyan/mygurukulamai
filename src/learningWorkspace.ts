export type TeacherProfile = { id: string; name: string; role: string; subjects: string[]; style: string; enabled: boolean };
export type TestExam = { id: string; title: string; subject: string; date: string; type: 'School' | 'Gurukulam'; topics: string; status: 'Upcoming' | 'Completed' };
export type ChapterPage = { number: number; text: string };
export type ChapterRecord = { id: string; subject: string; title: string; fileName: string; uploadedAt: string; pages: ChapterPage[] };
export type TeachingScope = 'full_chapter' | 'pages';
export type TeachingPlanItem = { id: string; subject: string; topic: string; duration: number; objective: string; completed: boolean; scope: TeachingScope; chapterId?: string; pageNumbers?: number[] };
export type HomeworkItem = { id: string; subject: string; title: string; instructions: string; dueDate: string; status: 'Pending' | 'Submitted' | 'Completed' };
export type ChildWorkspace = { teachers: TeacherProfile[]; subjects: string[]; chapters: ChapterRecord[]; tests: TestExam[]; today: TeachingPlanItem[]; homework: HomeworkItem[] };
export type LearningWorkspace = Record<string, ChildWorkspace>;

export function defaultWorkspace(subjects: string[] = []): ChildWorkspace { return { teachers: [], subjects: cleanSubjectList(subjects), chapters: [], tests: [], today: [], homework: [] }; }
function cleanString(value: unknown, max = 500): string { return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max) : ''; }
function cleanSubjectList(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.map(item => cleanString(item, 100)).filter(Boolean))] : []; }
function cleanPages(value: unknown): ChapterPage[] { if (!Array.isArray(value)) return []; return value.map(page => { if (!page || typeof page !== 'object') return null; const raw = page as ChapterPage; const number = Number(raw.number); return { number: Number.isInteger(number) && number > 0 ? number : 1, text: cleanString(raw.text, 6000) }; }).filter((page): page is ChapterPage => Boolean(page)); }
function stableId(prefix: string, seed: string): string { let hash = 2166136261; for (const char of seed) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return `${prefix}-${(hash >>> 0).toString(36)}`; }
function cleanStatus(value: unknown, allowed: readonly string[], fallback: string): string { return typeof value === 'string' && allowed.includes(value) ? value : fallback; }

export function normalizeWorkspace(value: unknown): LearningWorkspace {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: LearningWorkspace = {};
  for (const [rawChildId, rawWorkspace] of Object.entries(value as Record<string, unknown>)) {
    const childId = cleanString(rawChildId, 150);
    if (!childId) continue;
    if (!rawWorkspace || typeof rawWorkspace !== 'object' || Array.isArray(rawWorkspace)) { result[childId] = defaultWorkspace(); continue; }
    const workspace = rawWorkspace as Partial<ChildWorkspace>;
    const teachers = Array.isArray(workspace.teachers) ? workspace.teachers.map((raw, index) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const teacher = raw as TeacherProfile; const name = cleanString(teacher.name, 100); const subjects = cleanSubjectList(teacher.subjects);
      if (!name || !subjects.length) return null;
      const id = cleanString(teacher.id, 100) || stableId('teacher', `${childId}|${name}|${subjects.join('|')}|${index}`);
      return { id, name, role: cleanString(teacher.role, 100) || 'Personal AI Teacher', subjects, style: cleanString(teacher.style, 250) || 'Warm, patient and step-by-step', enabled: Boolean(teacher.enabled) };
    }).filter((teacher): teacher is TeacherProfile => Boolean(teacher)) : [];
    const chapters = Array.isArray(workspace.chapters) ? workspace.chapters.map((raw, index) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const chapter = raw as ChapterRecord; const subject = cleanString(chapter.subject, 100); const title = cleanString(chapter.title, 200);
      if (!subject || !title) return null;
      const id = cleanString(chapter.id, 100) || stableId('chapter', `${childId}|${subject}|${title}|${cleanString(chapter.fileName, 255)}|${index}`);
      return { id, subject, title, fileName: cleanString(chapter.fileName, 255), uploadedAt: cleanString(chapter.uploadedAt, 50), pages: cleanPages(chapter.pages) };
    }).filter((chapter): chapter is ChapterRecord => Boolean(chapter)) : [];
    const chapterIds = new Set(chapters.map(chapter => chapter.id));
    const subjects = cleanSubjectList(workspace.subjects);
    const today: TeachingPlanItem[] = [];
    if (Array.isArray(workspace.today)) for (const [index, raw] of workspace.today.entries()) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const item = raw as TeachingPlanItem; const itemSubject = cleanString(item.subject, 100); const chapterId = cleanString(item.chapterId, 100);
      if (!itemSubject || !chapterId || !chapterIds.has(chapterId)) continue;
      const scope: TeachingScope = item.scope === 'pages' ? 'pages' : 'full_chapter';
      const pageNumbers = Array.isArray(item.pageNumbers) ? [...new Set(item.pageNumbers.map(Number).filter(number => Number.isInteger(number) && number > 0))].sort((a, b) => a - b) : undefined;
      if (scope === 'pages' && !pageNumbers?.length) continue;
      const id = cleanString(item.id, 100) || stableId('plan', `${childId}|${itemSubject}|${chapterId}|${cleanString(item.topic, 300)}|${index}`);
      today.push({ id, subject: itemSubject, topic: cleanString(item.topic, 300), duration: Math.max(1, Math.min(240, Number(item.duration) || 25)), objective: cleanString(item.objective, 500), completed: Boolean(item.completed), scope, chapterId, ...(scope === 'pages' ? { pageNumbers } : {}) });
    }
    const tests = Array.isArray(workspace.tests) ? workspace.tests.map((raw, index) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const test = raw as TestExam; const id = cleanString(test.id, 100) || stableId('test', `${childId}|${cleanString(test.title, 200)}|${index}`); const title = cleanString(test.title, 200); const subject = cleanString(test.subject, 100);
      if (!title || !subject) return null;
      return { id, title, subject, date: cleanString(test.date, 50), type: cleanStatus(test.type, ['School', 'Gurukulam'], 'Gurukulam') as TestExam['type'], topics: cleanString(test.topics, 1000), status: cleanStatus(test.status, ['Upcoming', 'Completed'], 'Upcoming') as TestExam['status'] };
    }).filter((test): test is TestExam => Boolean(test)) : [];
    const homework = Array.isArray(workspace.homework) ? workspace.homework.map((raw, index) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const item = raw as HomeworkItem; const id = cleanString(item.id, 100) || stableId('homework', `${childId}|${cleanString(item.title, 200)}|${index}`); const title = cleanString(item.title, 200); const subject = cleanString(item.subject, 100);
      if (!title || !subject) return null;
      return { id, subject, title, instructions: cleanString(item.instructions, 2000), dueDate: cleanString(item.dueDate, 50), status: cleanStatus(item.status, ['Pending', 'Submitted', 'Completed'], 'Pending') as HomeworkItem['status'] };
    }).filter((item): item is HomeworkItem => Boolean(item)) : [];
    result[childId] = { teachers, subjects, chapters, tests, today, homework };
  }
  return result;
}
