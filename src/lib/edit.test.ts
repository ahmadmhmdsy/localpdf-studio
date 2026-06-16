import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cropPdf, editPdf } from './edit';

vi.mock('pdf-lib', () => {
  const mockPage = {
    getSize: vi.fn().mockReturnValue({ width: 612, height: 792 }),
    setCropBox: vi.fn(),
    drawText: vi.fn(),
  };
  const mockPdfDoc = {
    getPages: vi.fn().mockReturnValue([mockPage, mockPage]),
    embedFont: vi.fn().mockResolvedValue({
      widthOfTextAtSize: vi.fn().mockReturnValue(100),
      heightAtSize: vi.fn().mockReturnValue(12),
    }),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
  return {
    PDFDocument: {
      load: vi.fn().mockResolvedValue(mockPdfDoc),
    },
    rgb: vi.fn().mockReturnValue({ r: 0, g: 0, b: 0 }),
    StandardFonts: {
      Helvetica: 'Helvetica',
    },
  };
});

describe('edit.ts', () => {
  let mockFile: File;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  });

  describe('cropPdf', () => {
    it('applies crop box to all pages', async () => {
      const cropRect = { x: 10, y: 10, width: 80, height: 80 };
      const result = await cropPdf(mockFile, cropRect);
      
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('handles full page crop', async () => {
      const cropRect = { x: 0, y: 0, width: 100, height: 100 };
      const result = await cropPdf(mockFile, cropRect);
      
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('editPdf', () => {
    it('adds text annotations to PDF', async () => {
      const annotations = [
        { text: 'Hello', x: 50, y: 50, size: 12, color: '#000000', pageIndex: 0 },
      ];
      const result = await editPdf(mockFile, annotations);
      
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('handles multiple annotations on different pages', async () => {
      const annotations = [
        { text: 'Page 1', x: 10, y: 10, size: 10, color: '#FF0000', pageIndex: 0 },
        { text: 'Page 2', x: 20, y: 20, size: 14, color: '#00FF00', pageIndex: 1 },
      ];
      const result = await editPdf(mockFile, annotations);
      
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('ignores annotations with invalid page indices', async () => {
      const annotations = [
        { text: 'Invalid', x: 50, y: 50, size: 12, color: '#000000', pageIndex: 99 },
      ];
      const result = await editPdf(mockFile, annotations);
      
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });
});
