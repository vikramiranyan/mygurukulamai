import type { Child } from '../types/parent';

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

export function sharedLearningScopeId(child: Pick<Child, 'id' | 'school' | 'grade' | 'section'>): string {
  const school = normalize(child.school);
  const grade = normalize(child.grade);
  const section = normalize(child.section);
  if (!school || !grade || !section) return child.id;
  return `shared-${hash(`${school}|${grade}|${section}`)}`;
}

export type LearningScopeGroup = {
  id: string;
  representative: Child;
  children: Child[];
};

export function distinctLearningScopeGroups(children: Child[]): LearningScopeGroup[] {
  const groups = new Map<string, LearningScopeGroup>();
  for (const child of children) {
    const id = sharedLearningScopeId(child);
    const existing = groups.get(id);
    if (existing) existing.children.push(child);
    else groups.set(id, { id, representative: child, children: [child] });
  }
  return [...groups.values()];
}
