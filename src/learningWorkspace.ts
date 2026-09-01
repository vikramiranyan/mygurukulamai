export type TeacherProfile = { id: string; name: string; role: string; subjects: string[]; style: string; enabled: boolean };
export type TestExam = { id: string; title: string; subject: string; date: string; type: 'School' | 'Gurukulam'; topics: string; status: 'Upcoming' | 'Completed' };
export type ChapterPage = { number: number; text: string };
export type ChapterRecord = { id: string; subject: string; title: string; fileName: string; uploadedAt: string; pages: ChapterPage[] };
export type TeachingScope = 'full_chapter' | 'pages';
export type TeachingPlanItem = { id: string; subject: string; topic: string; duration: number; objective: string; completed: boolean; scope: TeachingScope; chapterId?: string; pageNumbers?: number[] };
export type HomeworkItem = { id: string; subject: string; title: string; instructions: string; dueDate: string; status: 'Pending' | 'Submitted' | 'Completed' };
export type ChildWorkspace = { teachers: TeacherProfile[]; subjects: string[]; chapters: ChapterRecord[]; tests: TestExam[]; today: TeachingPlanItem[]; homework: HomeworkItem[] };
export type LearningWorkspace = Record<string, ChildWorkspace>;

/** A new child starts with no invented teachers, lessons, or subjects. All learning configuration is parent-created or timetable-derived. */
export function defaultWorkspace(subjects: string[] = []): ChildWorkspace {
  return {
    teachers: [],
    subjects: [...new Set(subjects.filter(Boolean))],
    chapters: [],
    tests: [],
    today: [],
    homework: [],
  };
}

export function normalizeWorkspace(value: unknown): LearningWorkspace {
  if (!value || typeof value !== 'object') return {};
  const result = value as LearningWorkspace;
  for (const [childId, workspace] of Object.entries(result)) {
    if (!workspace || typeof workspace !== 'object') { result[childId] = defaultWorkspace(); continue; }
    workspace.teachers ??= [];
    workspace.subjects ??= [];
    workspace.chapters ??= [];
    workspace.tests ??= [];
    workspace.today ??= [];
    workspace.homework ??= [];
    workspace.today = workspace.today.map(item => ({ ...item, scope: item.scope ?? 'full_chapter' }));
  }
  return result;
}
