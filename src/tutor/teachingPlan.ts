export type LearningProfile = { childId: string; grade: string; preferredLanguage: string; masteryByConcept: Record<string, number>; strengths?: string[]; needs?: string[] };
export type GroundedContext = { subject: string; chapter: string; concepts: string[]; trustedSource: boolean; sourcePages?: number[] };
export type TeachingPlan = { objective: string; steps: string[]; checks: string[]; adaptation: 'reteach' | 'practice' | 'advance' };

export function createTeachingPlan(profile: LearningProfile, context: GroundedContext): TeachingPlan {
  if (!context.trustedSource) throw new Error('Teaching requires a trusted curriculum source');
  const mastery = context.concepts.length ? context.concepts.reduce((s,c)=>s+(profile.masteryByConcept[c] ?? 0),0)/context.concepts.length : 0;
  const adaptation = mastery < 0.4 ? 'reteach' : mastery < 0.8 ? 'practice' : 'advance';
  return { objective: `Learn ${context.chapter} in ${context.subject}`, steps: adaptation === 'reteach' ? ['Explain simply','Give a worked example','Ask a guided question'] : adaptation === 'practice' ? ['Briefly explain','Give practice examples','Ask a knowledge check'] : ['Extend the concept','Challenge with an application','Ask a transfer question'], checks: context.concepts.slice(0,3).map(c=>`Check understanding of ${c}`), adaptation };
}
