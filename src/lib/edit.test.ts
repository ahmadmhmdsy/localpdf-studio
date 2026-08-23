import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cropPdf, editPdf } from './edit';

// Module-level mock handles accessible after vi.clearAllMocks.
// We declare them outside vi.mock and capture them on import.
let mockPages: { setCropBox: ReturnType<typeof vi.fn>; drawText: ReturnType<typeof vi.fn> }[];
let mockEmbedFont: ReturnType<typeof vi.fn>;
let mockSave: ReturnType<typeof vi.fn>;
let mockLoad: ReturnType<typeof vi.fn>;

vi.mock('pdf-lib', () => {
  return {
    PDFDocument: {
      load: vi.fn(async () => {
        mockPages = [
          { getSize: vi.fn().mockReturnValue({ width: 612, height: 792 }), setCropBox: vi.fn(), drawText: vi.fn() },
          { getSize: vi.fn().mockReturnValue({ width: 612, height: 792 }), setCropBox: vi.fn(), drawText: vi.fn() },
        ];
        mockEmbedFont = vi.fn().mockResolvedValue({
          widthOfTextAtSize: vi.fn().mockReturnValue(100),
          heightAtSize: vi.fn().mockReturnValue(12),
        });
        mockSave = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
        return {
          getPages: () => mockPages,
          embedFont: mockEmbedFont,
          save: mockSave,
        };
      }),
    },
    rgb: vi.fn().mockReturnValue({ r: 0, g: 0, b: 0 }),
    StandardFonts: { Helvetica: 'Helvetica' },
  };
});

describe('edit.ts', () => {
  let mockFile: File;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const pdfLib = await import('pdf-lib');
    mockLoad = pdfLib.PDFDocument.load as ReturnType<typeof vi.fn>;
  });

  describe('cropPdf', () => {
    it('applies crop box to all pages', async () => {
      const cropRect = { x: 10, y: 10, width: 80, height: 80 };
      const result = await cropPdf(mockFile, cropRect);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(mockLoad).toHaveBeenCalled();
      expect(mockPages[0].setCropBox).toHaveBeenCalledTimes(1);
      // cropPdf converts percentages (10/80/10/80) against page size 612×792
      expect(mockPages[0].setCropBox).toHaveBeenCalledWith(
        expect.closeTo(61.2, 0.01), expect.closeTo(79.2, 0.01), expect.closeTo(489.6, 0.01), expect.closeTo(633.6, 0.01)
      );
      expect(mockPages[1].setCropBox).toHaveBeenCalledTimes(1);
      expect(mockPages[1].setCropBox).toHaveBeenCalledWith(
        expect.closeTo(61.2, 0.01), expect.closeTo(79.2, 0.01), expect.closeTo(489.6, 0.01), expect.closeTo(633.6, 0.01)
      );
    });

    it('handles full page crop', async () => {
      const cropRect = { x: 0, y: 0, width: 100, height: 100 };
      const result = await cropPdf(mockFile, cropRect);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(mockLoad).toHaveBeenCalled();
      const mockPage = mockPages[0];
      // cropPdf converts 0/0/100/100% to 0/0/612/792 (full page size)
      expect(mockPage.setCropBox).toHaveBeenCalledWith(0, 0, 612, 792);
    });
  });

  describe('editPdf', () => {
    it('adds text annotations to PDF', async () => {
      const annotations = [
        { text: 'Hello', x: 50, y: 50, size: 12, color: '#000000', pageIndex: 0 },
      ];
      const result = await editPdf(mockFile, annotations);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(mockLoad).toHaveBeenCalled();
      const mockPage = mockPages[0];
      expect(mockPage.drawText).toHaveBeenCalledTimes(1);
      expect(mockPage.drawText).toHaveBeenCalledWith(
        'Hello',
        // editPdf converts 50/50% to 306/396 against page size 612×792
        expect.objectContaining({ x: 306, y: 396, size: 12 })
      );
    });

    it('handles multiple annotations on different pages', async () => {
      const annotations = [
        { text: 'Page 1', x: 10, y: 10, size: 10, color: '#FF0000', pageIndex: 0 },
        { text: 'Page 2', x: 20, y: 20, size: 14, color: '#00FF00', pageIndex: 1 },
      ];
      const result = await editPdf(mockFile, annotations);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(mockLoad).toHaveBeenCalled();
      expect(mockPages[0].drawText).toHaveBeenCalledWith('Page 1', expect.anything());
      expect(mockPages[1].drawText).toHaveBeenCalledWith('Page 2', expect.anything());
    });

    it('ignores annotations with invalid page indices', async () => {
      const annotations = [
        { text: 'Invalid', x: 50, y: 50, size: 12, color: '#000000', pageIndex: 99 },
      ];
      const result = await editPdf(mockFile, annotations);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(mockPages[0].drawText).not.toHaveBeenCalled();
      expect(mockPages[1].drawText).not.toHaveBeenCalled();
    });
  });
});