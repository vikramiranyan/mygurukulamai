import type { Teacher } from '../curriculum';

export type TeachingTurn = 'greet' | 'explain' | 'ask' | 'check' | 'reteach' | 'celebrate';
export type TeacherTurn = { teacher: Teacher; turn: TeachingTurn; text: string };

export function greeting(teacher: Teacher, childName: string, topic: string): TeacherTurn {
  return { teacher, turn: 'greet', text: `Hello ${childName}! I’m ${teacher}. Today we’ll learn ${topic}.` };
}

export function teacherTurn(teacher: Teacher, turn: Exclude<TeachingTurn, 'greet'>, topic: string): TeacherTurn {
  const text: Record<Exclude<TeachingTurn, 'greet'>, string> = {
    explain: `Let’s learn ${topic} step by step.`,
    ask: `Can you tell me what you think about ${topic}?`,
    check: `Let’s check what you remember about ${topic}.`,
    reteach: `That’s okay. I’ll explain ${topic} in a simpler way.`,
    celebrate: `Excellent work! You made progress on ${topic}.`
  };
  return { teacher, turn, text: text[turn] };
}
