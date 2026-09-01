export type TeacherProfile = { id: string; name: string; role: string; subjects: string[]; style: string; enabled: boolean };
export type TestExam = { id: string; title: string; subject: string; date: string; type: 'School' | 'Gurukulam'; topics: string; status: 'Upcoming' | 'Completed' };
export type ChapterPage = { number: number; text: string };
export type ChapterRecord = { id: string; subject: string; title: string; fileName: string; uploadedAt: string; pages: ChapterPage[] };
export type TeachingScope = 'full_chapter' | 'pages';
export type TeachingPlanItem = { id: string; subject: string; topic: string; duration: number; objective: string; completed: boolean; scope: TeachingScope; chapterId?: string; pageNumbers?: number[] };
export type HomeworkItem = { id: string; subject: string; title: string; instructions: string; dueDate: string; status: 'Pending' | 'Submitted' | 'Completed' };
export type ChildWorkspace = { teachers: TeacherProfile[]; subjects: string[]; chapters: ChapterRecord[]; tests: TestExam[]; today: TeachingPlanItem[]; homework: HomeworkItem[] };
export type LearningWorkspace = Record<string, ChildWorkspace>;

export function defaultWorkspace(subjects: string[] = []): ChildWorkspace {
  const unique = [...new Set(subjects.filter(Boolean))];
  const teacherNames = unique.map((subject, index) => ({ subject, name: index < 3 ? 'Vikram' : 'Raji' }));
  return {
    teachers: teacherNames.length ? [...new Map(teacherNames.map(({ name }) => [name, name])).values()].map(name => ({ id: `teacher-${name.toLowerCase()}`, name, role: 'Personal AI Teacher', subjects: teacherNames.filter(t => t.name === name).map(t => t.subject), style: 'Warm, patient and step-by-step', enabled: true })) : [
      { id: 'teacher-vikram', name: 'Vikram', role: 'Personal AI Teacher', subjects: [], style: 'Warm, patient and step-by-step', enabled: true },
      { id: 'teacher-raji', name: 'Raji', role: 'Personal AI Teacher', subjects: [], style: 'Encouraging, visual and conversational', enabled: true },
    ],
    subjects: unique,
    chapters: [],
    tests: [],
    today: unique.slice(0, 3).map((subject, i) => ({ id: `today-${i + 1}`, subject, topic: 'Next lesson', duration: 25, objective: `Build confidence in ${subject}.`, completed: false, scope: 'full_chapter' })),
    homework: [],
  };
}

export function normalizeWorkspace(value: unknown): LearningWorkspace {
  if (!value || typeof value !== 'object') return {};
  const result = value as LearningWorkspace;
  for (const workspace of Object.values(result)) {
    workspace.chapters ??= [];
    workspace.today ??= [];
    workspace.today = workspace.today.map(item => ({ ...item, scope: item.scope ?? 'full_chapter' }));
  }
  return result;
}
