export type LearnerProfile = {
  id: string;
  displayName: string;
  grade: number;
  preferredLanguage: 'English' | 'Hindi' | 'Tamil' | 'Telugu';
};

export type TeachingContext = {
  subject: string;
  topic: string;
  learner: LearnerProfile;
  sourcePages: number[];
};

export type TutorResponse = {
  explanation: string;
  question: string;
  expectedLevel: 'foundation' | 'developing' | 'confident';
  nextAction: 'explain' | 'practice' | 'assess' | 'review';
};

/** Deterministic policy layer. Model inference will plug into this contract later. */
export function buildTutorPolicy(context: TeachingContext): TutorResponse {
  const level = context.learner.grade <= 2 ? 'foundation' : 'developing';
  return {
    explanation: `Teach ${context.topic} for Grade ${context.learner.grade} using the approved source pages.`,
    question: `Can you tell me one thing you learned about ${context.topic}?`,
    expectedLevel: level,
    nextAction: 'explain'
  };
}
