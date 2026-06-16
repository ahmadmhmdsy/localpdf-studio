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
  const sortedPagesToRemove = pagesToRemove.sort((a, b) => b - a);
  
  if (sortedPagesToRemove.length === totalPages) {
    throw new Error("Cannot remove all pages from the document.");
  }
  if (sortedPagesToRemove.length === 0) {
    throw new Error(`No valid pages selected to remove. The document has ${totalPages} pages. Please ensure your range is within 1-${totalPages}.`);
  }

  for (const pageIndex of sortedPagesToRemove) {
    pdf.removePage(pageIndex);
  }

  return await pdf.save();
}

export async function addPageNumbers(file: File, position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' = 'bottom-center'): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  
  const pages = pdf.getPages();
  const totalPages = pages.length;
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const text = `${i + 1} / ${totalPages}`;
    const fontSize = 12;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    
    let x = width / 2 - textWidth / 2;
    let y = 30;
    
    if (position.includes('left')) x = 30;
    if (position.includes('right')) x = width - 30 - textWidth;
    if (position.includes('top')) y = height - 30;
    
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
