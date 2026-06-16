import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertToPdfA } from './pdfa';

vi.mock('pdf-lib', () => {
  const mockCatalog = {
    set: vi.fn(),
  };
  const mockContext = {
    obj: vi.fn(() => ({
      set: vi.fn(),
    })),
    register: vi.fn().mockReturnValue({}),
    stream: vi.fn().mockReturnValue({}),
  };
  const mockPdfDoc = {
    getTitle: vi.fn().mockReturnValue(null),
    getAuthor: vi.fn().mockReturnValue(null),
    setTitle: vi.fn(),
    setAuthor: vi.fn(),
    setCreator: vi.fn(),
    setProducer: vi.fn(),
    setCreationDate: vi.fn(),
    setModificationDate: vi.fn(),
    context: mockContext,
    catalog: mockCatalog,
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
  return {
    PDFDocument: {
      load: vi.fn().mockResolvedValue(mockPdfDoc),
    },
    PDFName: {
      of: vi.fn().mockReturnValue('PDFName'),
    },
    PDFString: {
      of: vi.fn().mockReturnValue('PDFString'),
    },
    PDFNumber: vi.fn(),
    PDFArray: vi.fn(),
    PDFDict: vi.fn(),
  };
});

describe('pdfa.ts', () => {
  let mockFile: File;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  });

  it('returns a result with bytes, level, notes, and isCompliant=false', async () => {
    const result = await convertToPdfA(mockFile, '2b');
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.level).toBe('2b');
    expect(result.isCompliant).toBe(false);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('always includes a disclaimer note about non-validation', async () => {
    const result = await convertToPdfA(mockFile, '1b');
    const hasDisclaimer = result.notes.some((n) => /NOT validated/i.test(n));
    expect(hasDisclaimer).toBe(true);
  });

  it('includes a note that no ICC profile is embedded', async () => {
    const result = await convertToPdfA(mockFile, '1b');
    const hasNoIcc = result.notes.some((n) => /no ICC profile/i.test(n));
    expect(hasNoIcc).toBe(true);
  });

  it('supports all three PDF/A levels', async () => {
    for (const level of ['1b', '2b', '3b'] as const) {
      const result = await convertToPdfA(mockFile, level);
      expect(result.level).toBe(level);
    }
  });
});
