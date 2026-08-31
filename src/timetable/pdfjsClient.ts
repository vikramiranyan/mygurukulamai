import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// Vite/GitHub Pages: bundle the worker with the application instead of relying
// on a CDN or a runtime-relative worker URL. This is the supported workaround
// for pdfjs-dist 4.x in Vite builds.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function withReadingOrder(content: any) {
  const items = (content.items || []).filter((item: any) => item && typeof item.str === 'string');
  const ordered = items.map((item: any, index: number) => ({
    item,
    index,
    x: Number(item.transform?.[4] ?? 0),
    y: Number(item.transform?.[5] ?? 0),
  })).sort((a, b) => {
    const yDelta = Math.abs(b.y - a.y);
    return yDelta > 2 ? b.y - a.y : a.x - b.x || a.index - b.index;
  });

  const rebuilt: any[] = [];
  let previousY: number | null = null;
  for (const entry of ordered) {
    const lineBreak = previousY !== null && Math.abs(entry.y - previousY) > 2;
    rebuilt.push({
      ...entry.item,
      str: `${lineBreak ? '\n' : ''}${entry.item.str}`,
      hasEOL: lineBreak,
    });
    previousY = entry.y;
  }
  return { ...content, items: rebuilt };
}

export function getDocument(source: any) {
  const loadingTask = pdfjs.getDocument({
    ...source,
    // Keep PDF.js image-decoder assets local to the application when needed.
    wasmUrl: new URL('pdfjs-dist/wasm/', import.meta.url).toString(),
  });

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
            page.getTextContent = async (...args: any[]) =>
              withReadingOrder(await originalGetTextContent(...args));
            return page;
          };
        },
      });
    }),
  };
}
