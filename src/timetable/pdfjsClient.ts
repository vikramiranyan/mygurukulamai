import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

function withReadingOrder(content: any) {
  const items = (content.items || []).filter((item: any) => item && typeof item.str === 'string');
  const ordered = items.map((item: any, index: number) => ({
    item,
    index,
    x: Number(item.transform?.[4] ?? 0),
    y: Number(item.transform?.[5] ?? 0),
  })).sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x || a.index - b.index);

  const rebuilt = [];
  let previousY: number | null = null;
  for (const entry of ordered) {
    const lineBreak = previousY !== null && Math.abs(entry.y - previousY) > 2;
    rebuilt.push({ ...entry.item, str: `${lineBreak ? '\n' : ''}${entry.item.str}`, hasEOL: lineBreak });
    previousY = entry.y;
  }
  return { ...content, items: rebuilt };
}

export function getDocument(source: any) {
  const loadingTask = pdfjs.getDocument(source);
  return {
    ...loadingTask,
    promise: loadingTask.promise.then((pdf: any) => {
      const originalGetPage = pdf.getPage.bind(pdf);
      return new Proxy(pdf, {
        get(target, property, receiver) {
          if (property !== 'getPage') return Reflect.get(target, property, receiver);
          return async (pageNumber: number) => {
            const page = await originalGetPage(pageNumber);
            const originalGetTextContent = page.getTextContent.bind(page);
            page.getTextContent = async (...args: any[]) => withReadingOrder(await originalGetTextContent(...args));
            return page;
          };
        },
      });
    }),
  };
}
