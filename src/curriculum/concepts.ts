export type Concept = { name: string; keywords: string[] };
const STOP_WORDS = new Set(['the','and','for','with','this','that','from','into','about','their','have','will','need','needs','helps','help']);
export function extractConcepts(text: string, max = 10): Concept[] {
  const words = text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
  const counts = new Map<string, number>();
  for (const word of words) if (!STOP_WORDS.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
  return [...counts.entries()].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0,max).map(([name]) => ({name,keywords:[name]}));
}
