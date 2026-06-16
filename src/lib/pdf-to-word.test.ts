import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetTextContent, mockGetPage, mockGetDocument } = vi.hoisted(() => {
  const mockGetTextContent = vi.fn();
  const mockGetPage = vi.fn().mockResolvedValue({ getTextContent: mockGetTextContent });
  const mockGetDocument = vi.fn(() => ({
    promise: Promise.resolve({ getPage: mockGetPage, numPages: 1 }),
  }));
  return { mockGetTextContent, mockGetPage, mockGetDocument };
});

vi.mock('pdfjs-dist', () => ({
  __esModule: true,
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: mockGetDocument,
}));

vi.mock('./pdfjs', () => ({
  pdfjsLib: { getDocument: mockGetDocument },
}));

const { mockParagraph, mockTextRun, mockDocument, mockToBlob } = vi.hoisted(() => ({
  mockParagraph: vi.fn(),
  mockTextRun: vi.fn(),
  mockDocument: vi.fn(),
  mockToBlob: vi.fn(),
}));

class ParagraphStub {
  opts: unknown;
  constructor(opts: unknown) {
    this.opts = opts;
  }
}
class TextRunStub {
  opts: { size?: number; text?: string };
  constructor(opts: { size?: number; text?: string }) {
    this.opts = opts;
  }
}
class DocumentStub {
  opts: unknown;
  constructor(opts: unknown) {
    this.opts = opts;
  }
}

vi.mock('docx', () => ({
  __esModule: true,
  get Document() {
    return mockDocument;
  },
  get Paragraph() {
    return mockParagraph;
  },
  get TextRun() {
    return mockTextRun;
  },
  Packer: { toBlob: mockToBlob },
  default: {
    get Document() {
      return mockDocument;
    },
    get Paragraph() {
      return mockParagraph;
    },
    get TextRun() {
      return mockTextRun;
    },
    Packer: { toBlob: mockToBlob },
  },
}));

import { convertPdfToWord } from './pdf-to-word';

describe('convertPdfToWord', () => {
  beforeEach(() => {
    mockParagraph.mockImplementation(
      class {
        opts: unknown;
        constructor(opts: unknown) {
          this.opts = opts;
        }
      } as unknown as (...args: unknown[]) => unknown,
    );
    mockTextRun.mockImplementation(
      class {
        opts: { size?: number; text?: string };
        constructor(opts: { size?: number; text?: string }) {
          this.opts = opts;
        }
      } as unknown as (...args: unknown[]) => unknown,
    );
    mockDocument.mockImplementation(
      class {
        opts: unknown;
        constructor(opts: unknown) {
          this.opts = opts;
        }
      } as unknown as (...args: unknown[]) => unknown,
    );
    mockToBlob.mockReset();
    mockToBlob.mockResolvedValue(
      new Blob(['x'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );
    mockParagraph.mockClear();
    mockTextRun.mockClear();
    mockDocument.mockClear();
    mockGetTextContent.mockReset();
    mockGetPage.mockResolvedValue({ getTextContent: mockGetTextContent });
    mockGetDocument.mockImplementation(() => ({
      promise: Promise.resolve({ getPage: mockGetPage, numPages: 1 }),
    }));
  });

  it('returns a Word (docx) Blob', async () => {
    mockGetTextContent.mockResolvedValueOnce({ items: [] });
    const file = new File([new Uint8Array([1])], 'in.pdf');
    const result = await convertPdfToWord(file);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toContain('wordprocessingml');
  });

  it('creates paragraphs for each non-empty line', async () => {
    mockGetTextContent.mockResolvedValueOnce({
      items: [
        { str: 'Hello', transform: [0, 0, 0, 0, 0, 200] },
        { str: 'World', transform: [0, 0, 0, 0, 50, 200] },
        { str: 'Second', transform: [0, 0, 0, 0, 0, 100] },
      ],
    });
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToWord(file);
    expect(mockParagraph).toHaveBeenCalled();
    expect(mockTextRun).toHaveBeenCalled();
  });

  it('skips empty lines after trim', async () => {
    mockTextRun.mockClear();
    mockGetTextContent.mockResolvedValueOnce({
      items: [
        { str: '   ', transform: [0, 0, 0, 0, 0, 200] },
        { str: '', transform: [0, 0, 0, 0, 0, 100] },
      ],
    });
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToWord(file);
    expect(mockTextRun).not.toHaveBeenCalled();
  });

  it('uses 11pt font (size 22 half-points)', async () => {
    const seenSizes: Array<number | undefined> = [];
    mockTextRun.mockImplementation(
      class {
        opts: { size?: number; text?: string };
        constructor(opts: { size?: number; text?: string }) {
          this.opts = opts;
          seenSizes.push(opts?.size);
        }
      } as unknown as (...args: unknown[]) => unknown,
    );
    mockGetTextContent.mockResolvedValueOnce({
      items: [{ str: 'Sample', transform: [0, 0, 0, 0, 0, 100] }],
    });
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToWord(file);
    expect(seenSizes).toContain(22);
  });

  it('builds a Document with a single section', async () => {
    mockGetTextContent.mockResolvedValueOnce({ items: [] });
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToWord(file);
    expect(mockDocument).toHaveBeenCalledTimes(1);
    const docArg = mockDocument.mock.calls[0][0] as { sections?: unknown[] };
    expect(Array.isArray(docArg.sections)).toBe(true);
  });
});
