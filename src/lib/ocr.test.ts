import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock tesseract.js (the real lib spawns a Web Worker that loads WASM and
// uses `import.meta`, both of which crash under jsdom).
const { mockRecognize, mockTerminate, mockCreateWorker } = vi.hoisted(() => ({
  mockRecognize: vi.fn(),
  mockTerminate: vi.fn(),
  mockCreateWorker: vi.fn(),
}));

vi.mock('tesseract.js', () => {
  const worker = { recognize: mockRecognize, terminate: mockTerminate };
  return {
    createWorker: mockCreateWorker.mockResolvedValue(worker),
    __esModule: true,
  };
});

// Mock pdfjs so we don't try to load a real PDF — the lib only calls
// `getDocument().promise`, `getPage()`, and `page.getViewport().render()`.
const { mockGetPage, mockGetDocument } = vi.hoisted(() => {
  const mockRender = vi.fn().mockReturnValue({ promise: Promise.resolve() });
  const mockGetViewport = vi.fn(() => ({ width: 200, height: 300 }));
  const mockGetPage = vi.fn().mockResolvedValue({
    getViewport: mockGetViewport,
    render: mockRender,
  });
  const mockGetDocument = vi.fn(() => ({
    promise: Promise.resolve({ getPage: mockGetPage, numPages: 1 }),
  }));
  return { mockGetPage, mockGetDocument };
});

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: mockGetDocument,
}));

vi.mock('./pdfjs', () => ({
  pdfjsLib: {
    getDocument: mockGetDocument,
  },
}));

// Mock pdf-lib — only the surface used by ocrPdf is needed.
const { mockDrawText, mockGetPages, mockGetSize, mockSave, mockLoad } = vi.hoisted(() => {
  const mockDrawText = vi.fn();
  const mockGetSize = vi.fn(() => ({ width: 612, height: 792 }));
  const mockGetPages = vi.fn(() => [
    { drawText: mockDrawText, getSize: mockGetSize },
    { drawText: mockDrawText, getSize: mockGetSize },
  ]);
  const mockSave = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
  const mockLoad = vi.fn().mockResolvedValue({
    getPages: mockGetPages,
    save: mockSave,
  });
  return { mockDrawText, mockGetPages, mockGetSize, mockSave, mockLoad };
});

vi.mock('pdf-lib', () => ({
  PDFDocument: { load: mockLoad },
  PDFImage: vi.fn(),
  rgb: vi.fn(() => ({ type: 'RGB', red: 0, green: 0, blue: 0 })),
}));

import { ocrPdf } from './ocr';

describe('ocrPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: one page, OCR returns one word.
    mockGetPages.mockReturnValue([
      { drawText: mockDrawText, getSize: mockGetSize },
    ]);
    mockRecognize.mockResolvedValue({
      data: {
        text: 'Hello',
        words: [{ text: 'Hello', bbox: { x0: 10, y0: 20, x1: 60, y1: 40 } }],
        lines: [],
        paragraphs: [],
        blocks: [],
      },
    });
    mockCreateWorker.mockResolvedValue({ recognize: mockRecognize, terminate: mockTerminate });
  });

  it('creates a Tesseract worker, recognizes pages, and returns the saved PDF', async () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'in.pdf', { type: 'application/pdf' });

    const result = await ocrPdf(file);

    expect(mockCreateWorker).toHaveBeenCalledWith('eng');
    expect(mockRecognize).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('always terminates the worker, even on success', async () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'in.pdf', { type: 'application/pdf' });

    await ocrPdf(file);

    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });

  it('always terminates the worker, even on failure', async () => {
    mockSave.mockRejectedValueOnce(new Error('save failed'));
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'in.pdf', { type: 'application/pdf' });

    await expect(ocrPdf(file)).rejects.toThrow('save failed');

    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });

  it('reports progress for each page (rendering → recognizing → embedding)', async () => {
    mockGetPages.mockReturnValue([
      { drawText: mockDrawText, getSize: mockGetSize },
      { drawText: mockDrawText, getSize: mockGetSize },
    ]);
    const onProgress = vi.fn();
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'in.pdf', { type: 'application/pdf' });

    await ocrPdf(file, onProgress);

    const statuses = onProgress.mock.calls.map(([arg]) => arg.status);
    // Two pages × three statuses each = 6 calls.
    expect(statuses).toEqual([
      'rendering', 'recognizing', 'embedding',
      'rendering', 'recognizing', 'embedding',
    ]);
    expect(onProgress.mock.calls[0][0]).toMatchObject({ page: 1, totalPages: 2, status: 'rendering' });
  });

  it('skips drawing when OCR returns no words', async () => {
    mockRecognize.mockResolvedValueOnce({
      data: { text: '', words: [], lines: [], paragraphs: [], blocks: [] },
    });
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'in.pdf', { type: 'application/pdf' });

    await ocrPdf(file);

    expect(mockDrawText).not.toHaveBeenCalled();
  });

  it('skips empty/whitespace words in the OCR output', async () => {
    mockRecognize.mockResolvedValueOnce({
      data: {
        text: '   ',
        words: [
          { text: '   ', bbox: { x0: 0, y0: 0, x1: 0, y1: 0 } },
          { text: 'Hello', bbox: { x0: 10, y0: 20, x1: 60, y1: 40 } },
        ],
        lines: [],
        paragraphs: [],
        blocks: [],
      },
    });
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'in.pdf', { type: 'application/pdf' });

    await ocrPdf(file);

    expect(mockDrawText).toHaveBeenCalledTimes(1);
    expect(mockDrawText).toHaveBeenCalledWith('Hello', expect.objectContaining({ opacity: 0.01 }));
  });

  it('flips Y from canvas coordinates to PDF coordinates', async () => {
    mockRecognize.mockResolvedValueOnce({
      data: {
        text: 'Hi',
        words: [{ text: 'Hi', bbox: { x0: 0, y0: 0, x1: 50, y1: 100 } }],
        lines: [],
        paragraphs: [],
        blocks: [],
      },
    });
    // Canvas is 200×300, PDF page is 612×792. y1=100 → (100/300)*792 = 264,
    // flipped → 792 - 264 = 528.
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'in.pdf', { type: 'application/pdf' });

    await ocrPdf(file);

    expect(mockDrawText).toHaveBeenCalledWith('Hi', expect.objectContaining({ y: 528 }));
  });

  it('logs but does not throw if worker.terminate() fails', async () => {
    mockTerminate.mockRejectedValueOnce(new Error('terminate failed'));
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'in.pdf', { type: 'application/pdf' });

    await expect(ocrPdf(file)).resolves.toBeInstanceOf(Uint8Array);
  });
});
