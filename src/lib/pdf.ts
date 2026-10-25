import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

export class InvalidPageRangeError extends Error {
  readonly input: string;
  constructor(message: string, input: string) {
    super(message);
    this.name = 'InvalidPageRangeError';
    this.input = input;
  }
}

/**
 * Parse a user-supplied page range string (e.g. `"1, 3-5, 8"`) into a sorted,
 * deduplicated list of zero-indexed page numbers.
 *
 * @param rangeString  The raw input, e.g. `"1, 3-5, 8"`. Whitespace and empty
 *                     segments are tolerated; an empty string is rejected.
 * @param totalPages   The total number of pages in the source document.
 *                     Bounds are validated against this number.
 * @returns Sorted, deduplicated array of zero-indexed page numbers.
 * @throws  {InvalidPageRangeError} If the input is empty, contains a non-integer,
 *          has `start > end`, references a page outside `1..totalPages`, or uses
 *          more than one dash in a range.
 *
 * @example
 * parsePageRanges("1, 3-5, 8", 10); // → [0, 2, 3, 4, 7]
 */
export function parsePageRanges(rangeString: string, totalPages: number): number[] {
  const trimmed = (rangeString ?? '').trim();
  if (trimmed === '') {
    throw new InvalidPageRangeError('Page range cannot be empty.', rangeString);
  }
  if (totalPages < 1) {
    throw new InvalidPageRangeError('Document has no pages.', rangeString);
  }

  const pagesToExtract = new Set<number>();
  const parts = trimmed.split(',').map((p) => p.trim()).filter((p) => p.length > 0);

  if (parts.length === 0) {
    throw new InvalidPageRangeError('Page range cannot be empty.', rangeString);
  }

  const naturalNumberPattern = /^\d+$/;

  for (const part of parts) {
    if (part.includes('-')) {
      const dashCount = (part.match(/-/g) ?? []).length;
      if (dashCount > 1) {
        throw new InvalidPageRangeError(
          `Invalid range "${part}" — only one dash allowed per range.`,
          rangeString,
        );
      }
      const [startStr, endStr] = part.split('-');
      if (!startStr || !endStr || !naturalNumberPattern.test(startStr) || !naturalNumberPattern.test(endStr)) {
        throw new InvalidPageRangeError(
          `Invalid range "${part}" — both start and end must be positive integers.`,
          rangeString,
        );
      }
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (start > end) {
        throw new InvalidPageRangeError(
          `Invalid range "${part}" — start (${start}) is greater than end (${end}).`,
          rangeString,
        );
      }
      for (let i = start; i <= end; i++) {
        if (i < 1 || i > totalPages) {
          throw new InvalidPageRangeError(
            `Page ${i} in range "${part}" is out of bounds (document has ${totalPages} pages).`,
            rangeString,
          );
        }
        pagesToExtract.add(i - 1);
      }
    } else {
      if (!naturalNumberPattern.test(part)) {
        throw new InvalidPageRangeError(
          `Invalid page "${part}" — expected a positive integer.`,
          rangeString,
        );
      }
      const page = parseInt(part, 10);
      if (page < 1 || page > totalPages) {
        throw new InvalidPageRangeError(
          `Page ${page} is out of bounds (document has ${totalPages} pages).`,
          rangeString,
        );
      }
      pagesToExtract.add(page - 1);
    }
  }

  return Array.from(pagesToExtract).sort((a, b) => a - b);
}

export async function extractPages(file: File, rangeString: string): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const totalPages = pdf.getPageCount();

  const sortedPages = parsePageRanges(rangeString, totalPages);
  
  if (sortedPages.length === 0) {
    throw new Error(`No valid pages selected. The document has ${totalPages} pages. Please ensure your range is within 1-${totalPages}.`);
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdf, sortedPages);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}

/** Prefix for every file the Split PDF tool produces, e.g. `split_invoice_1-3.pdf`. */
const SPLIT_FILE_PREFIX = 'split_';

/** Base name used when the uploaded file has no usable name. */
const SPLIT_FALLBACK_BASE_NAME = 'document';

/**
 * Characters that must not appear in a generated file name: the Windows-reserved
 * set plus control characters. They are replaced with an underscore when a
 * file name is derived from the upload.
 */
// eslint-disable-next-line no-control-regex -- control characters are invalid in a download name
const UNSAFE_FILE_NAME_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g;

/** How the Split PDF tool divides a document. */
export type SplitMode = 'ranges' | 'every-n' | 'each-page';

export interface SplitOptions {
  /** Comma-separated page ranges; one output file per range. Used by `ranges`. */
  rangeString?: string;
  /** Pages per output file; must be a whole number of at least 1. Used by `every-n`. */
  pagesPerFile?: number;
}

/** One document produced by a split. */
export interface SplitFile {
  /** Suggested download name, e.g. `split_invoice_1-3.pdf`. */
  fileName: string;
  /** PDF bytes of this segment. */
  data: Uint8Array;
}

/**
 * Split a PDF into one document per range, per N pages, or per page.
 *
 * The source document is loaded once and each output is built by copying the
 * relevant pages into a fresh `PDFDocument`, so an output never carries
 * unreferenced objects from the pages it leaves out.
 *
 * @throws {InvalidPageRangeError} If a range is malformed or out of bounds.
 * @throws {Error} If `pagesPerFile` is not a whole number of at least 1.
 */
export async function splitPdfToFiles(
  file: File,
  mode: SplitMode,
  options: SplitOptions = {},
): Promise<SplitFile[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const totalPages = pdf.getPageCount();

  if (totalPages < 1) {
    throw new Error('The document has no pages to split.');
  }

  const groups = planSplitGroups(totalPages, mode, options);
  const baseName = splitBaseName(file.name);
  const files: SplitFile[] = [];

  for (const pageIndices of groups) {
    const outputPdf = await PDFDocument.create();
    const copiedPages = await outputPdf.copyPages(pdf, pageIndices);
    copiedPages.forEach((page) => outputPdf.addPage(page));
    files.push({
      fileName: `${SPLIT_FILE_PREFIX}${baseName}_${pageRangeLabel(pageIndices)}.pdf`,
      data: await outputPdf.save(),
    });
  }

  return files;
}

/** Suggested ZIP name for a multi-file split, e.g. `split_invoice.zip`. */
export function getSplitArchiveFileName(fileName: string): string {
  return `${SPLIT_FILE_PREFIX}${splitBaseName(fileName)}.zip`;
}

function planSplitGroups(totalPages: number, mode: SplitMode, options: SplitOptions): number[][] {
  if (mode === 'ranges') {
    return parseSplitRanges(options.rangeString ?? '', totalPages);
  }
  if (mode === 'each-page') {
    return Array.from({ length: totalPages }, (_, index) => [index]);
  }

  const pagesPerFile = options.pagesPerFile;
  if (pagesPerFile === undefined || !Number.isInteger(pagesPerFile) || pagesPerFile < 1) {
    throw new Error('Pages per file must be a whole number of at least 1.');
  }

  const groups: number[][] = [];
  for (let start = 0; start < totalPages; start += pagesPerFile) {
    const end = Math.min(start + pagesPerFile, totalPages);
    groups.push(Array.from({ length: end - start }, (_, offset) => start + offset));
  }
  return groups;
}

/** One group per comma-separated range, so `"1-3, 7"` yields two documents. */
function parseSplitRanges(rangeString: string, totalPages: number): number[][] {
  const parts = rangeString.split(',').map((part) => part.trim()).filter((part) => part.length > 0);
  if (parts.length === 0) {
    throw new InvalidPageRangeError('Page range cannot be empty.', rangeString);
  }
  return parts.map((part) => parsePageRanges(part, totalPages));
}

/** `split_<base>` part of a generated name, built from the uploaded file name. */
function splitBaseName(fileName: string): string {
  const sanitized = (fileName ?? '')
    .replace(/\.pdf$/i, '')
    .replace(UNSAFE_FILE_NAME_CHARS, '_')
    .trim();
  return sanitized.length > 0 ? sanitized : SPLIT_FALLBACK_BASE_NAME;
}

/** 1-based label for a contiguous group of zero-based page indices. */
function pageRangeLabel(pageIndices: number[]): string {
  const first = pageIndices[0] + 1;
  const last = pageIndices[pageIndices.length - 1] + 1;
  return first === last ? `${first}` : `${first}-${last}`;
}

export async function addWatermark(file: File, text: string): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  
  const pages = pdf.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const fontSize = 60;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - textHeight / 2,
      size: fontSize,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.3,
      rotate: degrees(45),
    });
  }
  
  return await pdf.save();
}

export async function rotatePdf(file: File, angle: number): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  const pages = pdf.getPages();
  for (const page of pages) {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + angle));
  }
  
  return await pdf.save();
}

export async function removePages(file: File, rangeString: string): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const totalPages = pdf.getPageCount();

  const pagesToRemove = parsePageRanges(rangeString, totalPages);

  if (pagesToRemove.length === totalPages) {
    throw new Error("Cannot remove all pages from the document.");
  }

  const removedPages = new Set(pagesToRemove);
  const keptPageIndices = pdf.getPageIndices().filter((pageIndex) => !removedPages.has(pageIndex));

  // Build a fresh document from the kept pages instead of mutating the source:
  // the removed pages (and anything only they referenced) are never written.
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdf, keptPageIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}










































































































































































/**
 * Positions offered by the Add Page Numbers tool, listed top row first so the
 * 3x3 picker in the UI renders them in reading order.
 */
export const PAGE_NUMBER_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

export type PageNumberPosition = (typeof PAGE_NUMBER_POSITIONS)[number];

/** Default placement, kept unchanged for existing users of the tool. */
export const DEFAULT_PAGE_NUMBER_POSITION: PageNumberPosition = 'bottom-center';

export async function addPageNumbers(
  file: File,
  position: PageNumberPosition = DEFAULT_PAGE_NUMBER_POSITION,
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  
  const pages = pdf.getPages();
  const totalPages = pages.length;
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const text = `${i + 1} / ${totalPages}`;
    
    // Scale font size based on page dimensions
    const baseSize = Math.min(width, height);
    const fontSize = Math.max(8, Math.min(14, baseSize / 50));
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    
    // Calculate margins based on page size
    const margin = Math.max(20, Math.min(40, baseSize / 20));
    
    let x = width / 2 - textWidth / 2;
    let y = margin;
    
    if (position.includes('left')) x = margin;
    if (position.includes('right')) x = width - margin - textWidth;
    if (position.includes('top')) y = height - margin - fontSize;
    // Middle row: center the text box on the vertical axis of the page box.
    if (position.includes('middle')) y = (height - fontSize) / 2;
    
    // Add a subtle background for better visibility
    const padding = 4;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = fontSize + padding * 2;
    const bgX = x - padding;
    const bgY = y - padding;
    
    page.drawRectangle({
      x: bgX,
      y: bgY,
      width: bgWidth,
      height: bgHeight,
      color: rgb(1, 1, 1),
      opacity: 0.8,
    });
    
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });
  }
  
  return await pdf.save();
}

export async function reorderPdfPages(file: File, newOrder: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdf, newOrder);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}