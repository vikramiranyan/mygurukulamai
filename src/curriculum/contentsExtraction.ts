export type ContentsEntry = { title: string; page?: number };

/** Deterministic extraction for already-supplied contents text. Network/PDF adapters can be injected later. */
export function extractContentsEntries(text: string): ContentsEntry[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const match = line.match(/^(.*?)(?:\.{2,}|\s+)\s*(\d+)$/);
    return match ? [{ title: match[1].trim(), page: Number(match[2]) }] : [{ title: line }];
  });
}
