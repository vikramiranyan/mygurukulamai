export type LearningProfile = {
  mastery: number;
  age?: number;
  recentMistakes?: string[];
  consecutiveCorrect?: number;
  consecutiveIncorrect?: number;
};
export type LessonContext = { subject: string; chapter: string; concepts: string[]; profile: LearningProfile };
export type TeachingPlan = { mode: 'reteach' | 'practice' | 'advance'; steps: string[]; checks: number; rationale?: string };

export function generateTeachingPlan(c: LessonContext): TeachingPlan {
  const m = Math.max(0, Math.min(1, Number.isFinite(c.profile.mastery) ? c.profile.mastery : 0));
  const failures = Math.max(0, c.profile.consecutiveIncorrect ?? 0);
  const wins = Math.max(0, c.profile.consecutiveCorrect ?? 0);

  if (m < 0.5 || failures >= 2) {
    return {
      mode: 'reteach',
      steps: ['Explain simply', 'Give a worked example', 'Ask a guided question', 'Check understanding'],
      checks: 2,
      rationale: failures >= 2 ? 'Repeated errors trigger a gentler reteach loop.' : 'Low mastery needs a simpler explanation before progression.'
    };
  }
  if (m < 0.8 || (c.profile.recentMistakes?.length ?? 0) > 0) {
    return {
      mode: 'practice',
      steps: ['Briefly review', 'Give graduated examples', 'Ask Socratic questions', 'Check understanding'],
      checks: 3,
      rationale: 'Developing mastery benefits from varied practice and gradual removal of hints.'
    };
  }
  return {
    mode: 'advance',
    steps: wins >= 2 ? ['Quick retrieval check', 'Introduce next concept', 'Apply with a challenge', 'Check mastery'] : ['Quick retrieval check', 'Introduce next concept', 'Apply with a challenge', 'Check mastery'],
    checks: 2,
    rationale: 'Stable mastery supports transfer to a harder application.'
  };
}

export function teachingPlanForScore(scorePercent: number): TeachingPlan {
  if (!Number.isFinite(scorePercent)) return generateTeachingPlan({ subject: '', chapter: '', concepts: [], profile: { mastery: 0 } });
  return generateTeachingPlan({ subject: '', chapter: '', concepts: [], profile: { mastery: Math.max(0, Math.min(100, scorePercent)) / 100 } });
}
