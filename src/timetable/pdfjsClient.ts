import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type TextItemLike = {
  str: string;
  transform?: number[];
  hasEOL?: boolean;
};

function withReadingOrder(content: { items: unknown[] }) {
  const items = content.items.filter((item): item is TextItemLike => Boolean(item && typeof item === 'object' && 'str' in item));
  const ordered = items.map((item, index) => ({ item, index, x: Number(item.transform?.[4] ?? 0), y: Number(item.transform?.[5] ?? 0) }))
    .sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x || a.index - b.index);

  const rebuilt: TextItemLike[] = [];
  let previousY: number | null = null;
  for (const entry of ordered) {
    const lineBreak = previousY !== null && Math.abs(entry.y - previousY) > 2;
    rebuilt.push({ ...entry.item, str: `${lineBreak ? '\n' : ''}${entry.item.str}`, hasEOL: lineBreak });
    previousY = entry.y;
  }
  return { ...content, items: rebuilt };
}

export function getDocument(source: Parameters<typeof pdfjs.getDocument>[0]) {
  const loadingTask = pdfjs.getDocument(source);
  return {
    ...loadingTask,
    promise: loadingTask.promise.then(async pdf => {
      const originalGetPage = pdf.getPage.bind(pdf);
      pdf.getPage = async (pageNumber: number) => {
        const page = await originalGetPage(pageNumber);
        const originalGetTextContent = page.getTextContent.bind(page);
        page.getTextContent = async (...args: Parameters<typeof page.getTextContent>) => {
          const content = await originalGetTextContent(...args);
          return withReadingOrder(content);
        };
        return page;
      };
      return pdf;
    }),
  };
}
