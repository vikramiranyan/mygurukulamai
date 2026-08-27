import type { TeachingContext, TutorResponse } from './tutor';

export type TeachingPlan = { steps: Array<'explain' | 'example' | 'practice' | 'check' | 'reteach'> };
export type KnowledgeCheck = { question: string; expected: string; concept: string };
export type Diagnosis = { kind: 'correct' | 'misconception' | 'unknown'; feedback: string };

const unsafeTopics = ['self-harm', 'weapons', 'illegal drugs', 'sexual content'];

export function buildTeachingPlan(context: TeachingContext): TeachingPlan {
  const base: TeachingPlan = { steps: ['explain', 'example', 'practice', 'check'] };
  return context.learner.grade <= 2 ? base : { steps: ['explain', 'example', 'practice', 'practice', 'check'] };
}

export function buildKnowledgeCheck(context: TeachingContext): KnowledgeCheck {
  return { concept: context.topic, question: `What is one important idea about ${context.topic}?`, expected: 'A simple, curriculum-grounded answer.' };
}

export function diagnoseAnswer(answer: string): Diagnosis {
  const normalized = answer.trim();
  if (!normalized) return { kind: 'unknown', feedback: 'Let’s try a smaller question together.' };
  if (normalized.length < 3) return { kind: 'misconception', feedback: 'Good start. Let’s explain the idea one more time and try again.' };
  return { kind: 'correct', feedback: 'Good thinking. Now let’s check the next idea.' };
}

export function ageAppropriateResponse(response: TutorResponse, grade: number): TutorResponse {
  const blocked = unsafeTopics.some(topic => response.explanation.toLocaleLowerCase().includes(topic));
  if (blocked) return { ...response, explanation: 'I can help with safe, age-appropriate learning topics.', nextAction: 'review' };
  return grade <= 2 ? { ...response, explanation: response.explanation.replace(/\b(utilize|therefore|approximately)\b/gi, 'use') } : response;
}
