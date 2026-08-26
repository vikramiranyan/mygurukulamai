export type LessonMode = 'teach' | 'practice' | 'check' | 'reteach';

export type TeachingSession = {
  id: string;
  childId: string;
  subject: string;
  chapterId: string;
  teacher: 'Vikram' | 'Raji';
  mode: LessonMode;
  turn: number;
  concepts: string[];
  completedConcepts: string[];
  mistakes: string[];
  mastery: number;
};

export function startTeachingSession(input: Omit<TeachingSession, 'turn' | 'completedConcepts' | 'mistakes' | 'mastery'>): TeachingSession {
  return { ...input, turn: 0, completedConcepts: [], mistakes: [], mastery: 0 };
}

export function recordKnowledgeCheck(session: TeachingSession, correct: boolean, concept: string): TeachingSession {
  const completed = correct && !session.completedConcepts.includes(concept)
    ? [...session.completedConcepts, concept]
    : session.completedConcepts;
  const mistakes = correct ? session.mistakes : [...session.mistakes, concept];
  const mastery = session.concepts.length === 0 ? 0 : Math.round((completed.length / session.concepts.length) * 100);
  return { ...session, turn: session.turn + 1, completedConcepts: completed, mistakes, mastery };
}

export function nextLessonMode(session: TeachingSession): LessonMode {
  if (session.mistakes.length > 0 && session.mastery < 70) return 'reteach';
  if (session.mastery >= 80) return 'check';
  return session.turn === 0 ? 'teach' : 'practice';
}
