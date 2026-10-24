import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFArray, PDFDocument, PDFName } from 'pdf-lib';

// Mock tesseract.js (the real lib spawns a Web Worker that loads WASM, which
// jsdom cannot run).
const { mockRecognize, mockTerminate, mockCreateWorker } = vi.hoisted(() => ({
  mockRecognize: vi.fn(),
  mockTerminate: vi.fn(),
  mockCreateWorker: vi.fn(),
}));

vi.mock('tesseract.js', () => ({
  createWorker: mockCreateWorker,
  OEM: { LSTM_ONLY: 1 },
}));

// pdf.js page stub: a 612×792 page rendered at 2 px per point, no rotation.
const { mockGetTextContent, mockDestroy, mockGetDocument } = vi.hoisted(() => {
  const mockGetTextContent = vi.fn();
  const mockDestroy = vi.fn().mockResolvedValue(undefined);
  const page = {
    getTextContent: mockGetTextContent,
    getViewport: ({ scale }: { scale: number }) => ({
      width: 612 * scale,
      height: 792 * scale,
      convertToPdfPoint: (x: number, y: number) => [x / scale, 792 - y / scale],
    }),
    render: () => ({ promise: Promise.resolve() }),
    cleanup: vi.fn(),
  };
  const mockGetDocument = vi.fn(() => ({
    promise: Promise.resolve({ getPage: vi.fn().mockResolvedValue(page), numPages: 1 }),
    destroy: mockDestroy,
  }));
  return { mockGetTextContent, mockDestroy, mockGetDocument };
});

vi.mock('./pdfjs', () => ({ pdfjsLib: { getDocument: mockGetDocument } }));

import {
  ocrPdf,
  ocrAssetPaths,
  textLayerOperators,
  toVisualOrder,
  OcrCancelledError,
  OcrLanguageDataMissingError,
  OcrLimitError,
  type OcrWord,
} from './ocr';
import { MAX_OCR_FILE_SIZE_BYTES, MAX_OCR_PAGES } from '../constants/limits';
import { InvalidPageRangeError } from './pdf';

async function pdfFile(pages = 1): Promise<File> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i++) pdf.addPage([612, 792]);
  return new File([(await pdf.save()) as BlobPart], 'scan.pdf', { type: 'application/pdf' });
}

function words(...list: [string, number, number, number, number][]): { data: { words: OcrWord[] } } {
  return { data: { words: list.map(([text, x0, y0, x1, y1]) => ({ text, bbox: { x0, y0, x1, y1 } })) } };
}

function languageResponse(ok: boolean, contentType = 'application/gzip') {
  return vi.fn().mockResolvedValue({ ok, headers: new Headers({ 'content-type': contentType }) });
}

describe('ocrAssetPaths', () => {
  it('serves every Tesseract asset from the app origin', () => {
    expect(ocrAssetPaths('/app/')).toEqual({
      workerPath: '/app/tesseract/worker.min.js',
      corePath: '/app/tesseract/core',
      langPath: '/app/tesseract/lang',
    });
  });
});

describe('ocrPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWorker.mockResolvedValue({ recognize: mockRecognize, terminate: mockTerminate });
    mockRecognize.mockResolvedValue(words(['Hello', 100, 100, 300, 140]));
    mockGetTextContent.mockResolvedValue({ items: [] });
    vi.stubGlobal('fetch', languageResponse(true));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads the worker, core and language data from the app origin, not a CDN', async () => {
    await ocrPdf(await pdfFile(), { language: 'ara' });

    expect(fetch).toHaveBeenCalledWith('/tesseract/lang/ara.traineddata.gz', { method: 'HEAD' });
    expect(mockCreateWorker).toHaveBeenCalledWith('ara', 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/core',
      langPath: '/tesseract/lang',
      workerBlobURL: false,
    });
  });

  it('adds an invisible text layer and reports what it did', async () => {
    const result = await ocrPdf(await pdfFile());

    expect(result).toMatchObject({ pagesRecognized: 1, pagesSkipped: 0, wordsAdded: 1, charactersDropped: 0 });
    const doc = await PDFDocument.load(result.bytes);
    const contents = doc.getPage(0).node.Contents();
    // Original content wrapped in q … Q, then the text layer.
    expect(contents).toBeInstanceOf(PDFArray);
  });

  it('skips pages that already have text', async () => {
    mockGetTextContent.mockResolvedValue({ items: [{ str: 'Existing text' }] });
    const onProgress = vi.fn();

    const result = await ocrPdf(await pdfFile(), { onProgress });

    expect(mockRecognize).not.toHaveBeenCalled();
    expect(result).toMatchObject({ pagesRecognized: 0, pagesSkipped: 1 });
    expect(onProgress).toHaveBeenCalledWith({ page: 1, totalPages: 1, pageNumber: 1, status: 'skipped' });
  });

  it('can OCR pages with text when asked', async () => {
    mockGetTextContent.mockResolvedValue({ items: [{ str: 'Existing text' }] });

    const result = await ocrPdf(await pdfFile(), { skipPagesWithText: false });

    expect(mockGetTextContent).not.toHaveBeenCalled();
    expect(result.pagesRecognized).toBe(1);
  });

  it('reports progress for each page (rendering → recognizing → embedding)', async () => {
    const onProgress = vi.fn();

    await ocrPdf(await pdfFile(2), { onProgress });

    expect(onProgress.mock.calls.map(([p]) => p.status)).toEqual([
      'rendering', 'recognizing', 'embedding',
      'rendering', 'recognizing', 'embedding',
    ]);
    expect(onProgress.mock.calls[3][0]).toMatchObject({ page: 2, totalPages: 2 });
  });

  it('fails clearly when the language data is not deployed', async () => {
    vi.stubGlobal('fetch', languageResponse(false));
    await expect(ocrPdf(await pdfFile())).rejects.toBeInstanceOf(OcrLanguageDataMissingError);
    expect(mockCreateWorker).not.toHaveBeenCalled();
  });

  it('treats an HTML fallback page as missing language data', async () => {
    vi.stubGlobal('fetch', languageResponse(true, 'text/html; charset=utf-8'));
    await expect(ocrPdf(await pdfFile())).rejects.toThrow(/English OCR language data/);
  });

  it('rejects unsupported languages before doing any work', async () => {
    await expect(ocrPdf(await pdfFile(), { language: 'xyz' as never })).rejects.toThrow(/Unsupported/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('terminates the worker and releases pdf.js on failure', async () => {
    mockRecognize.mockRejectedValueOnce(new Error('recognize failed'));

    await expect(ocrPdf(await pdfFile())).rejects.toThrow('recognize failed');

    expect(mockTerminate).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('logs but does not throw if worker.terminate() fails', async () => {
    mockTerminate.mockRejectedValueOnce(new Error('terminate failed'));
    await expect(ocrPdf(await pdfFile())).resolves.toMatchObject({ wordsAdded: 1 });
  });

  it('does no work when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(ocrPdf(await pdfFile(), { signal: controller.signal })).rejects.toBeInstanceOf(OcrCancelledError);
    expect(fetch).not.toHaveBeenCalled();
    expect(mockCreateWorker).not.toHaveBeenCalled();
  });

  it('terminates the worker and releases pdf.js when cancelled mid-page', async () => {
    const controller = new AbortController();
    let rejectRecognize: (e: Error) => void = () => {};
    // The user cancels while the page is being recognized.
    mockRecognize.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRecognize = reject;
          setTimeout(() => controller.abort(), 0);
        }),
    );
    // A terminated tesseract worker rejects the pending job.
    mockTerminate.mockImplementationOnce(async () => rejectRecognize(new Error('worker terminated')));

    await expect(ocrPdf(await pdfFile(3), { signal: controller.signal })).rejects.toBeInstanceOf(
      OcrCancelledError,
    );

    expect(mockTerminate).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockRecognize).toHaveBeenCalledTimes(1);
  });

  it('stops before the next page when cancelled between pages', async () => {
    const controller = new AbortController();
    const onProgress = vi.fn((p) => {
      if (p.status === 'embedding') controller.abort();
    });

    await expect(ocrPdf(await pdfFile(3), { signal: controller.signal, onProgress })).rejects.toBeInstanceOf(
      OcrCancelledError,
    );

    expect(mockRecognize).toHaveBeenCalledTimes(1);
    expect(mockTerminate).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('refuses files over the size limit before reading them', async () => {
    const file = await pdfFile();
    Object.defineProperty(file, 'size', { value: MAX_OCR_FILE_SIZE_BYTES + 1 });
    const read = vi.spyOn(file, 'arrayBuffer');

    await expect(ocrPdf(file)).rejects.toThrow(OcrLimitError);
    expect(read).not.toHaveBeenCalled();
    expect(mockCreateWorker).not.toHaveBeenCalled();
  });

  it('processes only the pages in the range, in document order', async () => {
    const onProgress = vi.fn();

    const result = await ocrPdf(await pdfFile(5), { pageRange: '4, 2', onProgress });

    expect(result.pagesRecognized).toBe(2);
    const embedded = onProgress.mock.calls.map(([p]) => p).filter((p) => p.status === 'embedding');
    expect(embedded).toEqual([
      { page: 1, totalPages: 2, pageNumber: 2, status: 'embedding' },
      { page: 2, totalPages: 2, pageNumber: 4, status: 'embedding' },
    ]);
  });

  it('treats a blank range as all pages', async () => {
    const result = await ocrPdf(await pdfFile(3), { pageRange: '  ' });
    expect(result.pagesRecognized).toBe(3);
  });

  it('rejects an invalid range before starting the worker', async () => {
    await expect(ocrPdf(await pdfFile(3), { pageRange: '2-9' })).rejects.toBeInstanceOf(InvalidPageRangeError);
    expect(mockCreateWorker).not.toHaveBeenCalled();
  });

  it('lets a range bring a long PDF under the page limit', async () => {
    const result = await ocrPdf(await pdfFile(MAX_OCR_PAGES + 1), { pageRange: '1-2' });
    expect(result.pagesRecognized).toBe(2);
  });

  it('applies the page limit to the range', async () => {
    await expect(
      ocrPdf(await pdfFile(MAX_OCR_PAGES + 1), { pageRange: `1-${MAX_OCR_PAGES + 1}` }),
    ).rejects.toThrow(/page range covers/);
    expect(mockCreateWorker).not.toHaveBeenCalled();
  });

  it('refuses PDFs over the page limit before starting the worker', async () => {
    await expect(ocrPdf(await pdfFile(MAX_OCR_PAGES + 1))).rejects.toThrow(
      new RegExp(`${MAX_OCR_PAGES + 1} pages; OCR is limited to ${MAX_OCR_PAGES}`),
    );
    expect(mockCreateWorker).not.toHaveBeenCalled();
    expect(mockGetDocument).not.toHaveBeenCalled();
  });
});

describe('textLayerOperators', () => {
  const key = PDFName.of('GlyphLessFont');
  const identity = (x: number, y: number): [number, number] => [x, 792 - y];

  const ops = (list: OcrWord[], toPdf = identity) =>
    textLayerOperators(list, key, toPdf).operators.map((op) => op.toString().trim());

  it('writes each word with invisible rendering mode', () => {
    const lines = ops(words(['Hello', 100, 100, 300, 140]).data.words);
    expect(lines[0]).toBe('BT');
    expect(lines).toContain('3 Tr');
    expect(lines.at(-1)).toBe('ET');
  });

  it('sizes the word to its box: font size is the box height, squeezed to the box width', () => {
    const lines = ops(words(['Hello', 100, 100, 300, 140]).data.words);
    const size = Number(lines.find((l) => l.endsWith('Tf'))!.split(' ')[1]);
    const tz = Number(lines.find((l) => l.endsWith('Tz'))!.split(' ')[0]);
    expect(size).toBeCloseTo(40, 5);
    // Every character advances half an em.
    expect((5 * 0.5 * size * tz) / 100).toBeCloseTo(200, 5);
  });

  it('places the baseline on the bottom of the box', () => {
    const lines = ops(words(['Hello', 100, 100, 300, 140]).data.words);
    const [a, b, c, d, e, f] = lines.find((l) => l.endsWith('Tm'))!.split(' ').map(Number);
    expect([a, b, c, d]).toEqual([1, 0, 0, 1]);
    expect(e).toBeCloseTo(100);
    // Box bottom is at PDF y = 792 - 140 = 652.
    expect(f).toBeCloseTo(652);
  });

  it('writes the text as Unicode code points', () => {
    const lines = ops(words(['Hi', 0, 0, 50, 20]).data.words);
    expect(lines).toContain('<00480069> Tj');
  });

  it('writes Arabic in visual order', () => {
    // "سلام" reversed: م ا ل س
    const lines = ops(words(['سلام', 0, 0, 50, 20]).data.words);
    expect(lines).toContain('<0645062706440633> Tj');
  });

  it('follows page rotation through the coordinate mapping', () => {
    // A page rotated 90°: image x runs up the PDF y axis.
    const rotated = (x: number, y: number): [number, number] => [y, x];
    const lines = ops(words(['Hi', 0, 0, 50, 20]).data.words, rotated);
    const [a, b, c, d] = lines.find((l) => l.endsWith('Tm'))!.split(' ').map(Number);
    expect([a, b]).toEqual([0, 1]);
    expect([c, d]).toEqual([-1, 0]);
  });

  it('keeps any BMP script, drops characters outside it and skips empty words', () => {
    const result = textLayerOperators(
      words(['   ', 0, 0, 0, 0], ['日本', 0, 0, 40, 20], ['Café→😀', 10, 10, 90, 30]).data.words,
      key,
      identity,
    );
    expect(result.wordsAdded).toBe(2);
    expect(result.charactersDropped).toBe(1);
  });

  it('skips words with an empty box', () => {
    expect(textLayerOperators(words(['Flat', 10, 10, 10, 10]).data.words, key, identity).wordsAdded).toBe(0);
  });
});

describe('toVisualOrder', () => {
  it('leaves left-to-right text alone', () => {
    expect(toVisualOrder('Hello')).toBe('Hello');
  });

  it('reverses an Arabic word', () => {
    expect(toVisualOrder('سلام')).toBe('مالس');
  });

  it('keeps digits and Latin runs in reading order inside an Arabic word', () => {
    expect(toVisualOrder('ص١٢')).toBe('١٢ص');
    expect(toVisualOrder('بPDF')).toBe('PDFب');
  });

  it('leaves mostly-Latin words alone, as pdf.js does', () => {
    expect(toVisualOrder('PDF،')).toBe('PDF،');
    expect(toVisualOrder('Helloب')).toBe('Helloب');
  });
});
