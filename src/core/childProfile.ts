export type ChildProfile = {
  id: string;
  name: string;
  grade: string;
  age?: number;
  preferredLanguage: 'English' | 'Hindi' | 'Tamil' | 'Telugu';
  strengths: string[];
  needsPractice: string[];
};

export function createChildProfile(input: Omit<ChildProfile, 'strengths' | 'needsPractice'>): ChildProfile {
  return { ...input, strengths: [], needsPractice: [] };
}

export function updateLearningNeeds(profile: ChildProfile, concept: string, mastered: boolean): ChildProfile {
  const strengths = mastered && !profile.strengths.includes(concept) ? [...profile.strengths, concept] : profile.strengths;
  const needsPractice = mastered ? profile.needsPractice.filter(x => x !== concept) : [...new Set([...profile.needsPractice, concept])];
  return { ...profile, strengths, needsPractice };
}
