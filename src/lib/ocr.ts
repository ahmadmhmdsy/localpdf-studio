import {
  PDFDocument,
  PDFName,
  PDFOperator,
  TextRenderingMode,
  beginText,
  endText,
  popGraphicsState,
  pushGraphicsState,
  setCharacterSqueeze,
  setFontAndSize,
  setTextMatrix,
  setTextRenderingMode,
  showText,
  type PDFPage,
} from 'pdf-lib';
import { pdfjsLib } from './pdfjs';
import { GLYPHLESS_ADVANCE, GLYPHLESS_FONT_NAME, embedGlyphlessFont, encodeGlyphless } from './glyphlessFont';
import { logError } from './logger';
import { parsePageRanges } from './pdf';
import { MAX_OCR_FILE_SIZE_BYTES, MAX_OCR_FILE_SIZE_MB, MAX_OCR_PAGES } from '../constants/limits';

// Each language needs its data in public/tesseract/lang (see the README there).
export const OCR_LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'ara', label: 'Arabic' },
] as const;

export type OcrLanguage = (typeof OCR_LANGUAGES)[number]['code'];

export interface OcrProgress {
  /** Position within the pages being processed (1-based). */
  page: number;
  /** Number of pages being processed: the page range, or the whole document. */
  totalPages: number;
  /** The page's number in the document (1-based). */
  pageNumber: number;
  status: 'rendering' | 'recognizing' | 'embedding' | 'skipped';
}

export interface OcrOptions {
  language?: OcrLanguage;
  /** Pages that already contain text are left alone, so search hits are not doubled. */
  skipPagesWithText?: boolean;
  onProgress?: (progress: OcrProgress) => void;
  /** Pages to process, e.g. `"1-3, 7"`; all pages when empty. Invalid input throws `InvalidPageRangeError`. */
  pageRange?: string;
  /** Aborting stops between steps and terminates the worker mid-page; `ocrPdf` then rejects with `OcrCancelledError`. */
  signal?: AbortSignal;
}

export interface OcrResult {
  bytes: Uint8Array;
  pagesRecognized: number;
  pagesSkipped: number;
  wordsAdded: number;
  /** Recognized characters outside the Unicode BMP, which the text layer cannot encode; they are left out. */
  charactersDropped: number;
}

export interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/** Maps a point in rendered-image pixels to PDF user space. */
export type ToPdfPoint = (x: number, y: number) => [number, number];

export class OcrLanguageDataMissingError extends Error {
  constructor(label: string) {
    super(`${label} OCR language data is not included in this build, so OCR cannot run.`);
    this.name = 'OcrLanguageDataMissingError';
  }
}

export class OcrCancelledError extends Error {
  constructor() {
    super('OCR was cancelled.');
    this.name = 'OcrCancelledError';
  }
}

export class OcrLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OcrLimitError';
  }
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new OcrCancelledError();
}

// Tesseract is most accurate around 300 DPI; the pixel cap bounds memory on large pages.
const TARGET_DPI = 300;
const MAX_RENDER_SIDE = 4000;

export function ocrAssetPaths(base: string = import.meta.env.BASE_URL) {
  const root = `${base.replace(/\/$/, '')}/tesseract`;
  return { workerPath: `${root}/worker.min.js`, corePath: `${root}/core`, langPath: `${root}/lang` };
}

async function assertLanguageData(langPath: string, language: OcrLanguage): Promise<void> {
  const label = OCR_LANGUAGES.find((l) => l.code === language)?.label ?? language;
  let available = false;
  try {
    const response = await fetch(`${langPath}/${language}.traineddata.gz`, { method: 'HEAD' });
    // A dev server or SPA host answers unknown paths with index.html.
    available = response.ok && !(response.headers.get('content-type') ?? '').includes('text/html');
  } catch {
    available = false;
  }
  if (!available) throw new OcrLanguageDataMissingError(label);
}

export async function ocrPdf(
  file: File,
  { language = 'eng', skipPagesWithText = true, onProgress, signal, pageRange }: OcrOptions = {},
): Promise<OcrResult> {
  if (!OCR_LANGUAGES.some((l) => l.code === language)) {
    throw new Error(`Unsupported OCR language: ${language}`);
  }
  if (file.size > MAX_OCR_FILE_SIZE_BYTES) {
    throw new OcrLimitError(`This file is larger than ${MAX_OCR_FILE_SIZE_MB} MB, the OCR limit. Split it first.`);
  }
  throwIfCancelled(signal);
  const paths = ocrAssetPaths();
  await assertLanguageData(paths.langPath, language);

  // Dynamic import to avoid loading tesseract.js unless needed
  const { createWorker, OEM } = await import('tesseract.js');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const pageCount = pdf.getPageCount();
  const pageIndices = pageRange?.trim() ? parsePageRanges(pageRange, pageCount) : pdf.getPageIndices();
  if (pageIndices.length > MAX_OCR_PAGES) {
    throw new OcrLimitError(
      pageRange?.trim()
        ? `The page range covers ${pageIndices.length} pages; OCR is limited to ${MAX_OCR_PAGES}. Choose fewer pages.`
        : `This PDF has ${pageCount} pages; OCR is limited to ${MAX_OCR_PAGES}. Choose a page range or split it first.`,
    );
  }
  throwIfCancelled(signal);
  // pdf.js takes ownership of the buffer it is given, so hand it a copy.
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
  const pdfJsDoc = await loadingTask.promise;

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  let terminated: Promise<unknown> | null = null;
  const terminate = () => {
    if (worker && !terminated) {
      const active = worker;
      terminated = (async () => active.terminate())().catch((termError) =>
        logError('Failed to terminate OCR worker:', termError),
      );
    }
    return terminated;
  };
  // Terminating the worker is the only way to interrupt a page that is being recognized.
  signal?.addEventListener('abort', terminate);
  try {
    // Same-origin worker; the CSP has no blob: worker source.
    worker = await createWorker(language, OEM.LSTM_ONLY, { ...paths, workerBlobURL: false });
    throwIfCancelled(signal);

    const fontRef = embedGlyphlessFont(pdf);
    const pages = pdf.getPages();
    const totalPages = pageIndices.length;
    const result = { pagesRecognized: 0, pagesSkipped: 0, wordsAdded: 0, charactersDropped: 0 };

    for (let n = 0; n < totalPages; n++) {
      throwIfCancelled(signal);
      const i = pageIndices[n];
      const position = { page: n + 1, totalPages, pageNumber: i + 1 };
      const page = await pdfJsDoc.getPage(i + 1);
      try {
        if (skipPagesWithText) {
          const content = await page.getTextContent();
          if (content.items.some((item) => 'str' in item && item.str.trim() !== '')) {
            result.pagesSkipped++;
            onProgress?.({ ...position, status: 'skipped' });
            continue;
          }
        }

        onProgress?.({ ...position, status: 'rendering' });
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(TARGET_DPI / 72, MAX_RENDER_SIDE / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Canvas 2D is not available for OCR rendering.');
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        throwIfCancelled(signal);

        onProgress?.({ ...position, status: 'recognizing' });
        let data;
        try {
          ({ data } = await worker.recognize(canvas));
        } catch (recognizeError) {
          // A terminated worker rejects with its own error; report the cancellation instead.
          throwIfCancelled(signal);
          throw recognizeError;
        }
        canvas.width = 0;
        canvas.height = 0;

        onProgress?.({ ...position, status: 'embedding' });
        const toPdfPoint: ToPdfPoint = (x, y) => viewport.convertToPdfPoint(x, y) as [number, number];
        const layer = textLayerOperators(data.words ?? [], pages[i].node.newFontDictionary(GLYPHLESS_FONT_NAME, fontRef), toPdfPoint);
        if (layer.operators.length > 0) appendIsolated(pdf, pages[i], layer.operators);
        result.pagesRecognized++;
        result.wordsAdded += layer.wordsAdded;
        result.charactersDropped += layer.charactersDropped;
      } finally {
        page.cleanup();
      }
    }

    throwIfCancelled(signal);
    return { bytes: await pdf.save(), ...result };
  } finally {
    signal?.removeEventListener('abort', terminate);
    await terminate();
    await loadingTask.destroy();
  }
}

// Wrap the existing content in q/Q first, so a graphics state it leaves
// changed cannot move the text layer.
function appendIsolated(pdf: PDFDocument, page: PDFPage, operators: PDFOperator[]): void {
  const start = pdf.context.register(pdf.context.contentStream([pushGraphicsState()]));
  const end = pdf.context.register(pdf.context.contentStream([popGraphicsState()]));
  page.node.wrapContentStreams(start, end);
  page.pushOperators(...operators);
}

/**
 * Builds an invisible (render mode 3) text layer: each word sits on its
 * recognized box, horizontally squeezed to the box width, so selection and
 * search highlights line up with the scanned image.
 */
export function textLayerOperators(
  words: OcrWord[],
  fontKey: PDFName,
  toPdfPoint: ToPdfPoint,
): { operators: PDFOperator[]; wordsAdded: number; charactersDropped: number } {
  const operators: PDFOperator[] = [];
  let wordsAdded = 0;
  let charactersDropped = 0;

  for (const word of words) {
    const encoded = encodeGlyphless(toVisualOrder(word.text.trim()));
    charactersDropped += encoded.dropped;
    if (encoded.length === 0) continue;

    const { x0, y0, x1, y1 } = word.bbox;
    const origin = toPdfPoint(x0, y1);
    const right = toPdfPoint(x1, y1);
    const top = toPdfPoint(x0, y0);
    const width = Math.hypot(right[0] - origin[0], right[1] - origin[1]);
    const height = Math.hypot(top[0] - origin[0], top[1] - origin[1]);
    if (width <= 0 || height <= 0) continue;

    // Unit vectors along and up the word, in PDF space (handles page rotation).
    const u = [(right[0] - origin[0]) / width, (right[1] - origin[1]) / width];
    const v = [(top[0] - origin[0]) / height, (top[1] - origin[1]) / height];

    // The glyphless font is one em tall with no descender, so the font size is
    // the box height and the baseline is the box bottom.
    const size = height;
    const naturalWidth = (encoded.length * GLYPHLESS_ADVANCE * size) / 1000;

    operators.push(
      beginText(),
      setFontAndSize(fontKey, size),
      setTextRenderingMode(TextRenderingMode.Invisible),
      setCharacterSqueeze((width / naturalWidth) * 100),
      setTextMatrix(u[0], u[1], v[0], v[1], origin[0], origin[1]),
      showText(encoded.hex),
      endText(),
    );
    wordsAdded++;
  }

  return { operators, wordsAdded, charactersDropped };
}

// Characters pdf.js counts as right-to-left (bidi types R, AL, AN): Hebrew and
// Arabic letters and Arabic-Indic digits (not the extended Persian digits), but not
// marks or punctuation.
const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}]/u;
const ARABIC_INDIC_DIGIT = /[\u0660-\u0669\u06F0-\u06F9]/;
const LTR_CHAR = /[\p{L}\p{N}]/u;
const countsAsRtl = (char: string) =>
  RTL_SCRIPT.test(char) && LTR_CHAR.test(char) && !/[\u06F0-\u06F9]/.test(char);

/**
 * PDF text is stored in visual (left-to-right display) order, and viewers
 * reorder right-to-left runs back to logical order when extracting. Tesseract
 * returns logical order, so a right-to-left word is reversed, keeping runs of
 * Latin letters and digits (including Arabic-Indic digits) in their own order.
 * Like pdf.js, a word is reordered only when at least 30% of it is
 * right-to-left, or it is at most four characters long and has any.
 */
export function toVisualOrder(text: string): string {
  const chars = [...text];
  const rtlCount = chars.filter(countsAsRtl).length;
  if (rtlCount === 0 || (rtlCount / text.length < 0.3 && text.length > 4)) return text;
  const runs: { ltr: boolean; chars: string[] }[] = [];
  for (const char of chars) {
    const ltr = ARABIC_INDIC_DIGIT.test(char) || (LTR_CHAR.test(char) && !RTL_SCRIPT.test(char));
    const last = runs[runs.length - 1];
    if (last && last.ltr === ltr) last.chars.push(char);
    else runs.push({ ltr, chars: [char] });
  }
  return runs
    .reverse()
    .map((run) => (run.ltr ? run.chars : run.chars.reverse()).join(''))
    .join('');
}
