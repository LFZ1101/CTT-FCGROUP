import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function extractPages(buffer: Buffer, mimeType: string): Promise<ExtractedPage[]> {
  const mime = mimeType.toLowerCase();

  if (mime === 'application/pdf') {
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      isEvalSupported: false,
      useWorkerFetch: false,
      isOffscreenCanvasSupported: false,
    });
    const pdf = await loadingTask.promise;
    const pages: ExtractedPage[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? String(item.str) : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pages.push({ pageNumber, text });
    }
    return pages;
  }

  const raw = buffer.toString('utf8');
  if (mime === 'text/html' || mime === 'application/xhtml+xml') {
    return [{ pageNumber: 1, text: stripHtml(raw) }];
  }

  if (mime === 'text/plain') {
    return [{ pageNumber: 1, text: raw.replace(/\s+/g, ' ').trim() }];
  }

  throw new Error(`Extração não suportada para MIME: ${mimeType}`);
}
