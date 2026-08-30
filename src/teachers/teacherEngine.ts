export type TeacherName = 'Vikram' | 'Raji';
export type TeacherStyle = { tone: string; pacing: 'calm' | 'energetic'; encouragement: string; questioning: string };
export type TeacherContext = { teacher: TeacherName; subject: string; childName: string; grade: string; chapter: string; approvedSource?: string };
export type LessonMemory = { childId: string; teacher: TeacherName; subject: string; chapter: string; turns: number; strengths: string[]; needsPractice: string[]; lastPrompt?: string; lastOutcome?: 'correct' | 'retry' };
export type TeacherEngine = {
  resolveTeacher(subject: string): TeacherName;
  style(teacher: TeacherName): TeacherStyle;
  greeting(ctx: TeacherContext): string;
  explain(ctx: TeacherContext, concept: string): string;
  ask(ctx: TeacherContext, question: string): string;
  check(ctx: TeacherContext, prompt: string): string;
  reteach(ctx: TeacherContext, focus: string): string;
  updateMemory(memory: LessonMemory, outcome: 'correct' | 'retry', note?: string): LessonMemory;
  memoryKey(ctx: TeacherContext): string;
};

const VIKRAM_SUBJECTS = new Set(['english', 'maths', 'computer']);
const styles: Record<TeacherName, TeacherStyle> = {
  Vikram: { tone: 'clear and encouraging', pacing: 'energetic', encouragement: 'Nice thinking!', questioning: 'Use short Socratic questions and let the child reason first.' },
  Raji: { tone: 'warm and reassuring', pacing: 'calm', encouragement: 'Well done! Let’s explore it together.', questioning: 'Use gentle prompts, examples and curiosity-led questions.' }
};
function clean(v: string) { return v.trim().replace(/\s+/g, ' '); }
export function createTeacherEngine(): TeacherEngine {
  return {
    resolveTeacher(subject) { return VIKRAM_SUBJECTS.has(clean(subject).toLowerCase()) ? 'Vikram' : 'Raji'; },
    style(teacher) { return styles[teacher]; },
    greeting(ctx) { const t = this.style(ctx.teacher); return `Hello ${clean(ctx.childName)}! I’m ${ctx.teacher}. Today we’ll learn ${clean(ctx.chapter)} in ${clean(ctx.subject)}. ${t.encouragement}`; },
    explain(ctx, concept) { return `${ctx.teacher}: Let’s make ${clean(concept)} simple. I’ll explain one small idea at a time, then we’ll try it together.`; },
    ask(ctx, question) { return `${ctx.teacher}: ${clean(question)} Take your time and tell me how you think about it.`; },
    check(ctx, prompt) { return `${ctx.teacher}: Quick check — ${clean(prompt)}`; },
    reteach(ctx, focus) { return `${ctx.teacher}: No problem. Let’s try ${clean(focus)} another way, with a simpler example.`; },
    updateMemory(memory, outcome, note) {
      const next: LessonMemory = { ...memory, turns: memory.turns + 1, lastOutcome: outcome, strengths: [...memory.strengths], needsPractice: [...memory.needsPractice] };
      if (note) { const list = outcome === 'correct' ? next.strengths : next.needsPractice; if (!list.includes(note)) list.push(note); }
      return next;
    },
    memoryKey(ctx) { return `${ctx.childName}:${ctx.subject}:${ctx.chapter}:${ctx.teacher}`; }
  };
}
