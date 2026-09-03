export type TeacherProfile = { id: string; name: string; role: string; subjects: string[]; style: string; enabled: boolean };
export type TestExam = { id: string; title: string; subject: string; date: string; type: 'School' | 'Gurukulam'; topics: string; status: 'Upcoming' | 'Completed' };
export type ChapterPage = { number: number; text: string };
export type ChapterRecord = { id: string; subject: string; title: string; fileName: string; uploadedAt: string; pages: ChapterPage[] };
export type TeachingScope = 'full_chapter' | 'pages';
export type TeachingPlanItem = { id: string; subject: string; topic: string; duration: number; objective: string; completed: boolean; scope: TeachingScope; chapterId?: string; pageNumbers?: number[] };
export type HomeworkItem = { id: string; subject: string; title: string; instructions: string; dueDate: string; status: 'Pending' | 'Submitted' | 'Completed' };
export type ChildWorkspace = { teachers: TeacherProfile[]; subjects: string[]; chapters: ChapterRecord[]; tests: TestExam[]; today: TeachingPlanItem[]; homework: HomeworkItem[] };
export type LearningWorkspace = Record<string, ChildWorkspace>;

export function defaultWorkspace(subjects: string[] = []): ChildWorkspace { return { teachers: [], subjects: [...new Set(subjects.filter(Boolean))], chapters: [], tests: [], today: [], homework: [] }; }
function cleanString(value: unknown, max = 500): string { return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max) : ''; }
function cleanSubjectList(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.map(item => cleanString(item, 100)).filter(Boolean))] : []; }
function cleanPages(value: unknown): ChapterPage[] { if (!Array.isArray(value)) return []; return value.map(page => { if (!page || typeof page !== 'object') return null; const raw = page as ChapterPage; return { number: Math.max(1, Number(raw.number) || 1), text: cleanString(raw.text, 6000) }; }).filter((page): page is ChapterPage => Boolean(page)); }

export function normalizeWorkspace(value: unknown): LearningWorkspace {
  if (!value || typeof value !== 'object') return {};
  const result: LearningWorkspace = {};
  for (const [childId, rawWorkspace] of Object.entries(value as Record<string, unknown>)) {
    if (!rawWorkspace || typeof rawWorkspace !== 'object') { result[childId] = defaultWorkspace(); continue; }
    const workspace = rawWorkspace as Partial<ChildWorkspace>;
    const teachers = Array.isArray(workspace.teachers) ? workspace.teachers.map(raw => {
      if (!raw || typeof raw !== 'object') return null;
      const teacher = raw as TeacherProfile; const name = cleanString(teacher.name, 100); const subjects = cleanSubjectList(teacher.subjects);
      if (!name || !subjects.length) return null;
      return { id: cleanString(teacher.id, 100) || crypto.randomUUID(), name, role: cleanString(teacher.role, 100) || 'Personal AI Teacher', subjects, style: cleanString(teacher.style, 250) || 'Warm, patient and step-by-step', enabled: Boolean(teacher.enabled) };
    }).filter((teacher): teacher is TeacherProfile => Boolean(teacher)) : [];
    const chapters = Array.isArray(workspace.chapters) ? workspace.chapters.map(raw => {
      if (!raw || typeof raw !== 'object') return null;
      const chapter = raw as ChapterRecord; const subject = cleanString(chapter.subject, 100); const title = cleanString(chapter.title, 200);
      if (!subject || !title) return null;
      return { id: cleanString(chapter.id, 100) || crypto.randomUUID(), subject, title, fileName: cleanString(chapter.fileName, 255), uploadedAt: cleanString(chapter.uploadedAt, 50), pages: cleanPages(chapter.pages) };
    }).filter((chapter): chapter is ChapterRecord => Boolean(chapter)) : [];
    const chapterIds = new Set(chapters.map(chapter => chapter.id));
    const subjects = cleanSubjectList(workspace.subjects);
    const today: TeachingPlanItem[] = [];
    if (Array.isArray(workspace.today)) for (const raw of workspace.today) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as TeachingPlanItem; const itemSubject = cleanString(item.subject, 100); const chapterId = cleanString(item.chapterId, 100);
      if (!itemSubject || !chapterId || !chapterIds.has(chapterId)) continue;
      const scope: TeachingScope = item.scope === 'pages' ? 'pages' : 'full_chapter';
      const pageNumbers = Array.isArray(item.pageNumbers) ? [...new Set(item.pageNumbers.map(Number).filter(number => Number.isInteger(number) && number > 0))].sort((a, b) => a - b) : undefined;
      if (scope === 'pages' && !pageNumbers?.length) continue;
      today.push({ id: cleanString(item.id, 100) || crypto.randomUUID(), subject: itemSubject, topic: cleanString(item.topic, 300), duration: Math.max(1, Math.min(240, Number(item.duration) || 25)), objective: cleanString(item.objective, 500), completed: Boolean(item.completed), scope, chapterId, ...(scope === 'pages' ? { pageNumbers } : {}) });
    }
    const tests = Array.isArray(workspace.tests) ? workspace.tests.map(raw => raw && typeof raw === 'object' ? raw as TestExam : null).filter((test): test is TestExam => Boolean(test?.id && test.title && test.subject)) : [];
    const homework = Array.isArray(workspace.homework) ? workspace.homework.map(raw => raw && typeof raw === 'object' ? raw as HomeworkItem : null).filter((item): item is HomeworkItem => Boolean(item?.id && item.title && item.subject)) : [];
    result[childId] = { teachers, subjects, chapters, tests, today, homework };
  }
  return result;
}
