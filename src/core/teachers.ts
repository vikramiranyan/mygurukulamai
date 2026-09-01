export type TeacherPersona = {
  name: string;
  subjects: string[];
  style: 'structured' | 'warm' | 'custom';
  voiceEnabled: boolean;
  animationEnabled: boolean;
};

/** Build a teacher persona from explicit parent configuration. No teachers or subject assignments are seeded here. */
export function createTeacherPersona(input: { name: string; subjects: string[]; style?: TeacherPersona['style']; voiceEnabled?: boolean; animationEnabled?: boolean }): TeacherPersona {
  const name = input.name.trim();
  if (!name) throw new Error('Teacher name is required.');
  const subjects = [...new Set(input.subjects.map(subject => subject.trim()).filter(Boolean))];
  return { name, subjects, style: input.style || 'custom', voiceEnabled: input.voiceEnabled ?? true, animationEnabled: input.animationEnabled ?? true };
}
