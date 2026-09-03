export type LearningPhase = 'teach' | 'practice' | 'check' | 'reteach' | 'mastered';

export type AnswerRecord = {
  questionId: string;
  correct: boolean;
  attempts?: number;
  hintUsed?: boolean;
  responseMs?: number;
};

export type LearningSession = {
  childId: string;
  subject: string;
  chapterId: string;
  phase: LearningPhase;
  answers: AnswerRecord[];
  masteryScore: number;
  startedAt: number;
  lastActivityAt: number;
  streak: number;
};

export function scoreAnswers(answers: AnswerRecord[]): number {
  if (!answers.length) return 0;
  const weighted = answers.map((answer, index) => {
    let value = answer.correct ? 1 : 0;
    if (answer.hintUsed) value -= 0.15;
    const inferredAttempts = answers.slice(0, index + 1).filter(item => item.questionId === answer.questionId).length;
    const attempts = Math.max(1, answer.attempts ?? inferredAttempts);
    if (attempts > 1) value -= Math.min(0.2, (attempts - 1) * 0.05);
    if (typeof answer.responseMs === 'number' && answer.responseMs > 30000) value -= 0.05;
    return Math.max(0, Math.min(1, value));
  });
  return Math.round((weighted.reduce((sum, value) => sum + value, 0) / weighted.length) * 100);
}

export function nextPhase(score: number): LearningPhase {
  if (score >= 85) return 'mastered';
  if (score >= 60) return 'check';
  return 'reteach';
}

export function startSession(childId: string, subject: string, chapterId: string): LearningSession {
  const now = Date.now();
  return { childId, subject, chapterId, phase: 'teach', answers: [], masteryScore: 0, startedAt: now, lastActivityAt: now, streak: 0 };
}

export function recordSessionAnswer(session: LearningSession, answer: AnswerRecord): LearningSession {
  const answers = [...session.answers, answer];
  const streak = answer.correct ? session.streak + 1 : 0;
  const masteryScore = scoreAnswers(answers);
  return { ...session, answers, masteryScore, phase: nextPhase(masteryScore), lastActivityAt: Date.now(), streak };
}
