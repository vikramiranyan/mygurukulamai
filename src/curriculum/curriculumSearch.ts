export type CurriculumItem = { id: string; title: string; subject: string; grade: string; chapter: string };
export function searchCurriculum(items: CurriculumItem[], query: string): CurriculumItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(i => [i.title, i.subject, i.grade, i.chapter].some(v => v.toLowerCase().includes(q)));
}
