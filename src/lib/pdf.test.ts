import { describe, it, expect } from 'vitest';
import {
  PDFDocument,
  PDFArray,
  PDFRawStream,
  PDFRef,
  StandardFonts,
  decodePDFRawStream,
} from 'pdf-lib';
import {
  parsePageRanges,
  InvalidPageRangeError,
  reorderPdfPages,
  addPageNumbers,
  DEFAULT_PAGE_NUMBER_POSITION,
  PAGE_NUMBER_POSITIONS,
  removePages,
  splitPdfToFiles,
  getSplitArchiveFileName,
} from './pdf';
import { generateDummyPdf } from '../tests/fixtures/pdfGenerator';

/**
 * Builds a PDF whose page widths identify each page, so a test can tell which
 * pages survived an operation and in what order.
 */
async function generateSizedPdf(widths: number[], fileName = 'sized-document.pdf'): Promise<File> {
  const doc = await PDFDocument.create();
  widths.forEach((width) => doc.addPage([width, 300]));
  const bytes = await doc.save();
  return new File([bytes.buffer as ArrayBuffer], fileName, { type: 'application/pdf' });
}

async function readPageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getWidth());
}

async function countIndirectObjects(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  return doc.context.enumerateIndirectObjects().length;
}

/**
 * A blank page whose dimensions make the addPageNumbers sizing rules land on
 * their clamp minimums: a 400x600 page gets an 8 pt label and a 20 pt margin.
 */
const PAGE_NUMBER_FIXTURE = { width: 400, height: 600, fontSize: 8, margin: 20 } as const;
const PAGE_NUMBER_FIXTURE_TEXT = '1 / 1';

async function generateBlankPdf(): Promise<File> {
  const doc = await PDFDocument.create();
  doc.addPage([PAGE_NUMBER_FIXTURE.width, PAGE_NUMBER_FIXTURE.height]);
  const bytes = await doc.save();
  return new File([bytes.buffer as ArrayBuffer], 'blank.pdf', { type: 'application/pdf' });
}

/**
 * Returns the decoded content stream of the first page. pdf-lib compresses
 * streams on save, so the drawing operators must be inflated before reading.
 */
async function readFirstPageContent(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  const contents = doc.getPages()[0].node.Contents();
  if (!contents) return '';

  const streams: PDFRawStream[] = [];
  const collect = (entry: unknown): void => {
    const resolved = doc.context.lookup(entry as PDFRef);
    if (resolved instanceof PDFRawStream) streams.push(resolved);
    else if (resolved instanceof PDFArray) resolved.asArray().forEach(collect);
  };

  if (contents instanceof PDFArray) contents.asArray().forEach(collect);
  else collect(contents);

  return streams
    .map((stream) =>
      Array.from(decodePDFRawStream(stream).decode(), (byte) => String.fromCharCode(byte)).join(''),
    )
    .join('\n');
}

/** Reads the text and the `Tm` translation that a drawText call wrote to the page. */
function readDrawnText(content: string): { text: string; x: number; y: number } {
  const placement = content.match(/1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm/);
  const encoded = content.match(/<([0-9A-Fa-f]+)> Tj/);
  if (!placement || !encoded) {
    throw new Error(`Expected a drawText operator in the page content stream:\n${content}`);
  }
  const text = (encoded[1].match(/../g) ?? [])
    .map((pair) => String.fromCharCode(parseInt(pair, 16)))
    .join('');
  return { text, x: Number(placement[1]), y: Number(placement[2]) };
}

describe('parsePageRanges', () => {
  it('should parse single pages correctly', () => {
    expect(parsePageRanges('1, 3, 5', 10)).toEqual([0, 2, 4]);
  });

  it('should parse ranges correctly', () => {
    expect(parsePageRanges('1-3', 10)).toEqual([0, 1, 2]);
  });

  it('should handle mixed single pages and ranges', () => {
    expect(parsePageRanges('1, 3-5, 8', 10)).toEqual([0, 2, 3, 4, 7]);
  });

  it('should throw on out of bounds pages', () => {
    expect(() => parsePageRanges('1, 15, 20-25', 10)).toThrow(InvalidPageRangeError);
  });

  it('should handle overlapping ranges and deduplicate', () => {
    expect(parsePageRanges('1-5, 3-7', 10)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('should throw on non-numeric input', () => {
    expect(() => parsePageRanges('abc, 1-xyz, 2', 10)).toThrow(InvalidPageRangeError);
  });

  it('should throw on completely invalid input', () => {
    expect(() => parsePageRanges('invalid', 10)).toThrow(InvalidPageRangeError);
  });

  it('should throw on empty string', () => {
    expect(() => parsePageRanges('', 10)).toThrow(InvalidPageRangeError);
  });

  it('should throw when start > end in a range', () => {
    expect(() => parsePageRanges('5-3', 10)).toThrow(/greater than end/);
  });

  it('should throw when document has no pages', () => {
    expect(() => parsePageRanges('1', 0)).toThrow(/no pages/);
  });
});

describe('reorderPdfPages', () => {
  it('should reorder pages correctly', async () => {
    const pdfFile = await generateDummyPdf(3);
    const result = await reorderPdfPages(pdfFile, [1, 0, 2]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should handle single page', async () => {
    const pdfFile = await generateDummyPdf(1);
    const result = await reorderPdfPages(pdfFile, [0]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should throw on invalid reorder map', async () => {
    const pdfFile = await generateDummyPdf(2);
    await expect(reorderPdfPages(pdfFile, [0, 1, 2])).rejects.toThrow();
  });
});

describe('addPageNumbers', () => {
  const { width, height, fontSize, margin } = PAGE_NUMBER_FIXTURE;

  async function measureLabelWidth(): Promise<number> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    return font.widthOfTextAtSize(PAGE_NUMBER_FIXTURE_TEXT, fontSize);
  }

  it('adds page numbers at every offered position', async () => {
    const file = await generateBlankPdf();

    for (const position of PAGE_NUMBER_POSITIONS) {
      const result = await addPageNumbers(file, position);
      expect(result).toBeInstanceOf(Uint8Array);
    }
  });

  it('defaults to bottom-center', async () => {
    const textWidth = await measureLabelWidth();
    const file = await generateBlankPdf();

    const drawn = readDrawnText(await readFirstPageContent(await addPageNumbers(file)));
    const explicit = readDrawnText(
      await readFirstPageContent(await addPageNumbers(file, DEFAULT_PAGE_NUMBER_POSITION)),
    );

    expect(drawn.text).toBe(PAGE_NUMBER_FIXTURE_TEXT);
    expect(drawn.x).toBeCloseTo(width / 2 - textWidth / 2, 2);
    expect(drawn.y).toBeCloseTo(margin, 2);
    expect(drawn).toEqual(explicit);
  });

  PAGE_NUMBER_POSITIONS.forEach((position) => {
    it(`renders ${position} at the expected coordinates`, async () => {
      const textWidth = await measureLabelWidth();
      const expectedX = {
        left: margin,
        center: width / 2 - textWidth / 2,
        right: width - margin - textWidth,
      } as const;
      const expectedY = {
        top: height - margin - fontSize,
        middle: (height - fontSize) / 2,
        bottom: margin,
      } as const;

      const [row, column] = position.split('-') as [
        keyof typeof expectedY,
        keyof typeof expectedX,
      ];

      const result = await addPageNumbers(await generateBlankPdf(), position);
      const drawn = readDrawnText(await readFirstPageContent(result));

      expect(drawn.text).toBe(PAGE_NUMBER_FIXTURE_TEXT);
      expect(drawn.x).toBeCloseTo(expectedX[column], 2);
      expect(drawn.y).toBeCloseTo(expectedY[row], 2);
    });
  });
});

describe('removePages', () => {
  it('keeps the pages that were not removed, in order', async () => {
    const file = await generateSizedPdf([101, 102, 103, 104, 105]);

    const result = await removePages(file, '2, 4');

    expect(result).toBeInstanceOf(Uint8Array);
    expect(await readPageWidths(result)).toEqual([101, 103, 105]);
  });

  it('keeps leading and trailing pages when a middle range is removed', async () => {
    const file = await generateSizedPdf([201, 202, 203, 204, 205, 206]);

    const result = await removePages(file, '3-4');

    expect(await readPageWidths(result)).toEqual([201, 202, 205, 206]);
  });

  it('rebuilds a fresh document instead of mutating the source', async () => {
    const file = await generateSizedPdf([301, 302, 303, 304, 305]);
    const sourceObjectCount = await countIndirectObjects(new Uint8Array(await file.arrayBuffer()));

    const result = await removePages(file, '2, 4');

    const rebuilt = await PDFDocument.load(result);
    expect(rebuilt.getPageCount()).toBe(3);
    expect(rebuilt.getPages().map((page) => page.getWidth())).toEqual([301, 303, 305]);
    // The removed pages' objects are not carried over: a rebuild holds only the
    // kept pages, so it has fewer indirect objects than the five-page source.
    expect(await countIndirectObjects(result)).toBeLessThan(sourceObjectCount);
  });

  it('rejects removing every page', async () => {
    const file = await generateSizedPdf([401, 402, 403]);

    await expect(removePages(file, '1-3')).rejects.toThrow('Cannot remove all pages');
  });

  it('rejects out-of-bounds page ranges', async () => {
    const file = await generateSizedPdf([501, 502]);

    await expect(removePages(file, '1-9')).rejects.toThrow(InvalidPageRangeError);
  });
});

describe('splitPdfToFiles', () => {
  it('creates one file per comma-separated range', async () => {
    const file = await generateSizedPdf([501, 502, 503, 504, 505], 'quarterly-report.pdf');

    const files = await splitPdfToFiles(file, 'ranges', { rangeString: '1-2, 4, 5' });

    expect(files.map((splitFile) => splitFile.fileName)).toEqual([
      'split_quarterly-report_1-2.pdf',
      'split_quarterly-report_4.pdf',
      'split_quarterly-report_5.pdf',
    ]);
    expect(await readPageWidths(files[0].data)).toEqual([501, 502]);
    expect(await readPageWidths(files[1].data)).toEqual([504]);
    expect(await readPageWidths(files[2].data)).toEqual([505]);
  });

  it('creates one file per page', async () => {
    const file = await generateSizedPdf([601, 602, 603], 'notes.pdf');

    const files = await splitPdfToFiles(file, 'each-page');

    expect(files.map((splitFile) => splitFile.fileName)).toEqual([
      'split_notes_1.pdf',
      'split_notes_2.pdf',
      'split_notes_3.pdf',
    ]);
    expect(await readPageWidths(files[0].data)).toEqual([601]);
    expect(await readPageWidths(files[2].data)).toEqual([603]);
  });

  it('creates chunks of N pages, with the remainder in the last file', async () => {
    const file = await generateSizedPdf([701, 702, 703, 704, 705], 'chunks.pdf');

    const files = await splitPdfToFiles(file, 'every-n', { pagesPerFile: 2 });

    expect(files.map((splitFile) => splitFile.fileName)).toEqual([
      'split_chunks_1-2.pdf',
      'split_chunks_3-4.pdf',
      'split_chunks_5.pdf',
    ]);
    expect(await readPageWidths(files[0].data)).toEqual([701, 702]);
    expect(await readPageWidths(files[2].data)).toEqual([705]);
  });

  it('returns one file when N covers the whole document', async () => {
    const file = await generateSizedPdf([801, 802, 803], 'wide.pdf');

    const files = await splitPdfToFiles(file, 'every-n', { pagesPerFile: 10 });

    expect(files).toHaveLength(1);
    expect(files[0].fileName).toBe('split_wide_1-3.pdf');
    expect(await readPageWidths(files[0].data)).toEqual([801, 802, 803]);
  });

  it('rejects an empty range string', async () => {
    const file = await generateSizedPdf([901]);

    await expect(splitPdfToFiles(file, 'ranges', { rangeString: '  ' })).rejects.toThrow(
      /cannot be empty/i,
    );
  });

  it('rejects an out-of-bounds range', async () => {
    const file = await generateSizedPdf([902]);

    await expect(splitPdfToFiles(file, 'ranges', { rangeString: '2-4' })).rejects.toThrow(
      InvalidPageRangeError,
    );
  });

  it('rejects a non-positive or fractional chunk size', async () => {
    const file = await generateSizedPdf([903]);

    await expect(splitPdfToFiles(file, 'every-n', { pagesPerFile: 0 })).rejects.toThrow(
      /whole number/i,
    );
    await expect(splitPdfToFiles(file, 'every-n', { pagesPerFile: 2.5 })).rejects.toThrow(
      /whole number/i,
    );
  });

  it('derives safe names from the uploaded file name', async () => {
    const file = await generateSizedPdf([904, 905], 'Report: Q3/Final.PDF');

    const files = await splitPdfToFiles(file, 'each-page');

    expect(files.map((splitFile) => splitFile.fileName)).toEqual([
      'split_Report_ Q3_Final_1.pdf',
      'split_Report_ Q3_Final_2.pdf',
    ]);
  });

  it('falls back to a default base name when the upload has none', async () => {
    const file = await generateSizedPdf([906], '.pdf');

    const files = await splitPdfToFiles(file, 'each-page');

    expect(files[0].fileName).toBe('split_document_1.pdf');
  });
});

describe('getSplitArchiveFileName', () => {
  it('names the archive after the uploaded file', () => {
    expect(getSplitArchiveFileName('Invoice.PDF')).toBe('split_Invoice.zip');
    expect(getSplitArchiveFileName('notes')).toBe('split_notes.zip');
  });
});
