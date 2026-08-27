export type ChildProfile = {
  id: string;
  name: string;
  grade: number;
  age?: number;
  preferredLanguage?: string;
  activeSubjects: string[];
  strengths: string[];
  needsPractice: string[];
};

export function createChildProfile(input: Pick<ChildProfile, 'id' | 'name' | 'grade'> & Partial<ChildProfile>): ChildProfile {
  return {
    id: input.id,
    name: input.name,
    grade: input.grade,
    age: input.age,
    preferredLanguage: input.preferredLanguage ?? 'English',
    activeSubjects: input.activeSubjects ?? [],
    strengths: input.strengths ?? [],
    needsPractice: input.needsPractice ?? []
  };
}

export function setActiveChild(children: ChildProfile[], childId: string): ChildProfile | null {
  return children.find(child => child.id === childId) ?? null;
}
