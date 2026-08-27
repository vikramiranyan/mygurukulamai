export type LearningPhase = 'teach' | 'practice' | 'check' | 'reteach' | 'mastered';

export type AnswerRecord = {
  questionId: string;
  correct: boolean;
};

export type LearningSession = {
  childId: string;
  subject: string;
  chapterId: string;
  phase: LearningPhase;
  answers: AnswerRecord[];
  masteryScore: number;
};

export function scoreAnswers(answers: AnswerRecord[]): number {
  if (!answers.length) return 0;
  return Math.round((answers.filter(a => a.correct).length / answers.length) * 100);
}

export function nextPhase(score: number): LearningPhase {
  if (score >= 85) return 'mastered';
  if (score >= 60) return 'check';
  return 'reteach';
}

export function startSession(childId: string, subject: string, chapterId: string): LearningSession {
  return { childId, subject, chapterId, phase: 'teach', answers: [], masteryScore: 0 };
}
