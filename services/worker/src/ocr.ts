import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { ExtractedPage } from './extract.js';

const execFileAsync = promisify(execFile);

const MIN_AVG_CHARS = 80;
const EMPTY_PAGE_CHARS = 24;

export type ExtractionAssessment = {
  needsOcr: boolean;
  totalChars: number;
  avgCharsPerPage: number;
  emptyPages: number;
  pageCount: number;
  reason: string | null;
};

export type OcrRunResult = {
  attempted: boolean;
  applied: boolean;
  engine: string | null;
  reason: string;
  pagesOcrd?: number;
};

export function assessExtraction(pages: Array<{ text: string }>): ExtractionAssessment {
  const pageCount = pages.length;
  const charCounts = pages.map((p) => p.text.replace(/\s+/g, '').length);
  const totalChars = charCounts.reduce((a, b) => a + b, 0);
  const emptyPages = charCounts.filter((c) => c < EMPTY_PAGE_CHARS).length;
  const avgCharsPerPage = pageCount ? totalChars / pageCount : 0;

  const needsOcr =
    pageCount > 0 &&
    (totalChars < 40 || avgCharsPerPage < MIN_AVG_CHARS || emptyPages / pageCount >= 0.5);

  let reason: string | null = null;
  if (needsOcr) {
    if (totalChars < 40) reason = 'texto_quase_vazio';
    else if (emptyPages / pageCount >= 0.5) reason = 'muitas_paginas_vazias';
    else reason = 'baixa_densidade_textual';
  }

  return {
    needsOcr,
    totalChars,
    avgCharsPerPage: Number(avgCharsPerPage.toFixed(1)),
    emptyPages,
    pageCount,
    reason,
  };
}

async function hasBinary(name: string): Promise<boolean> {
  try {
    await execFileAsync('which', [name]);
    return true;
  } catch {
    return false;
  }
}

/**
 * OCR opcional via binários do sistema: `pdftoppm` (poppler) + `tesseract`.
 * Ativado apenas com OCR_ENABLED=true. Sem binários, retorna skipped sem falhar o parse.
 */
export async function maybeApplyOcr(
  pdfBuffer: Buffer,
  pages: ExtractedPage[],
  assessment: ExtractionAssessment,
): Promise<{ pages: ExtractedPage[]; ocr: OcrRunResult }> {
  if (!assessment.needsOcr) {
    return {
      pages,
      ocr: { attempted: false, applied: false, engine: null, reason: 'not_needed' },
    };
  }

  if (process.env.OCR_ENABLED !== 'true') {
    return {
      pages,
      ocr: {
        attempted: false,
        applied: false,
        engine: null,
        reason: 'ocr_disabled',
      },
    };
  }

  const hasPdftoppm = await hasBinary('pdftoppm');
  const hasTesseract = await hasBinary('tesseract');
  if (!hasPdftoppm || !hasTesseract) {
    return {
      pages,
      ocr: {
        attempted: true,
        applied: false,
        engine: null,
        reason: 'binaries_missing',
      },
    };
  }

  const lang = process.env.OCR_LANG || 'por+eng';
  const maxPages = Math.min(
    pages.length || 20,
    Math.max(1, Number(process.env.OCR_MAX_PAGES || 20)),
  );

  const dir = await mkdtemp(join(tmpdir(), 'cct-ocr-'));
  try {
    const pdfPath = join(dir, 'doc.pdf');
    await writeFile(pdfPath, pdfBuffer);
    await execFileAsync('pdftoppm', ['-png', '-f', '1', '-l', String(maxPages), pdfPath, join(dir, 'page')], {
      timeout: 120_000,
    });

    const ocrd: ExtractedPage[] = [];
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      const img = join(dir, `page-${pageNumber}.png`);
      let text = '';
      try {
        const outBase = join(dir, `out-${pageNumber}`);
        await execFileAsync('tesseract', [img, outBase, '-l', lang, '--psm', '6'], {
          timeout: 120_000,
        });
        text = (await readFile(`${outBase}.txt`, 'utf8')).replace(/\s+/g, ' ').trim();
      } catch {
        text = pages[pageNumber - 1]?.text || '';
      }
      ocrd.push({ pageNumber, text });
    }

    // Preserva páginas além do limite OCR com texto original
    for (let pageNumber = maxPages + 1; pageNumber <= pages.length; pageNumber++) {
      ocrd.push(pages[pageNumber - 1] || { pageNumber, text: '' });
    }

    const after = assessExtraction(ocrd);
    const applied = after.totalChars > assessment.totalChars;
    return {
      pages: applied ? ocrd : pages,
      ocr: {
        attempted: true,
        applied,
        engine: 'pdftoppm+tesseract',
        reason: applied ? 'ok' : 'no_gain',
        pagesOcrd: maxPages,
      },
    };
  } catch (err) {
    return {
      pages,
      ocr: {
        attempted: true,
        applied: false,
        engine: 'pdftoppm+tesseract',
        reason: err instanceof Error ? err.message.slice(0, 200) : 'ocr_failed',
      },
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
