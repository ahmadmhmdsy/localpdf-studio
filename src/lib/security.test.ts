import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { signPdf, redactPdf, dataUrlToBytes } from './security';

vi.mock('pdf-lib', () => {
  const mockPage = {
    getSize: vi.fn().mockReturnValue({ width: 612, height: 792 }),
    drawRectangle: vi.fn(),
    drawImage: vi.fn(),
    drawText: vi.fn(),
  };
  const mockPdfDoc = {
    getPages: vi.fn().mockReturnValue([mockPage]),
    getPageCount: vi.fn().mockReturnValue(1),
    embedPng: vi.fn().mockResolvedValue({ width: 100, height: 50 }),
    setTitle: vi.fn(),
    setAuthor: vi.fn(),
    setSubject: vi.fn(),
    setKeywords: vi.fn(),
    setCreator: vi.fn(),
    setProducer: vi.fn(),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    addPage: vi.fn().mockReturnValue(mockPage),
  };
  return {
    PDFDocument: {
      load: vi.fn().mockResolvedValue(mockPdfDoc),
      create: vi.fn().mockResolvedValue(mockPdfDoc),
    },
    rgb: vi.fn().mockReturnValue({ r: 0, g: 0, b: 0 }),
    degrees: vi.fn().mockReturnValue({ angle: 0 }),
    StandardFonts: { Helvetica: 'Helvetica' },
  };
});

vi.mock('./pdfjs', () => ({
  pdfjsLib: {
    getDocument: vi.fn(() => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
          render: vi.fn().mockResolvedValue({ promise: Promise.resolve() }),
        }),
        destroy: vi.fn().mockResolvedValue(undefined),
      }),
    })),
    GlobalWorkerOptions: { workerSrc: '' },
  },
}));

beforeAll(() => {
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb: (blob: Blob | null) => void) => {
    cb(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));
  }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '',
    fillRect: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('security.ts', () => {
  let mockFile: File;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  });

  describe('dataUrlToBytes', () => {
    it('decodes a valid base64 data URL to bytes', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = dataUrlToBytes(dataUrl);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      const bytes = new Uint8Array(buffer);
      expect(bytes[0]).toBe(0x89);
      expect(bytes[1]).toBe(0x50);
      expect(bytes[2]).toBe(0x4e);
      expect(bytes[3]).toBe(0x47);
    });

    it('round-trips a known short payload', () => {
      const original = 'Hello, PDF!';
      const base64 = btoa(original);
      const dataUrl = `data:text/plain;base64,${base64}`;
      const buffer = dataUrlToBytes(dataUrl);
      const decoded = new TextDecoder().decode(new Uint8Array(buffer));
      expect(decoded).toBe(original);
    });

    it('throws on missing base64 marker', () => {
      expect(() => dataUrlToBytes('data:image/png,abc')).toThrow('Invalid data URL');
    });

    it('throws on non-data URL', () => {
      expect(() => dataUrlToBytes('https://example.com/image.png')).toThrow('Invalid data URL');
    });

    it('throws on empty string', () => {
      expect(() => dataUrlToBytes('')).toThrow('Invalid data URL');
    });
  });

  describe('signPdf', () => {
    it('adds a signature image to PDF using dataUrlToBytes (no fetch)', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const signature = {
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        x: 50,
        y: 50,
        width: 20,
        height: 10,
        pageIndex: 0,
      };
      const result = await signPdf(mockFile, [signature]);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe('redactPdf', () => {
    it('returns a Uint8Array for valid input', async () => {
      const redactions = [
        { x: 10, y: 10, width: 20, height: 5, pageIndex: 0 },
      ];
      const result = await redactPdf(mockFile, redactions);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('handles multiple redactions on one page', async () => {
      const redactions = [
        { x: 10, y: 10, width: 10, height: 3, pageIndex: 0 },
        { x: 20, y: 20, width: 15, height: 4, pageIndex: 0 },
      ];
      const result = await redactPdf(mockFile, redactions);
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });
});
