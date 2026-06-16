import { describe, it, expect, vi } from 'vitest';
import {
  mergePdfs,
  parsePageRanges,
  extractPages,
  addWatermark,
  rotatePdf,
  removePages,
  InvalidPageRangeError,
} from '../../../lib/pdf';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      copyPages: vi.fn().mockResolvedValue([{ addPage: vi.fn() }]),
      addPage: vi.fn(),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      getPageCount: vi.fn().mockReturnValue(5),
      getPageIndices: vi.fn().mockReturnValue([0, 1, 2, 3, 4]),
      getPages: vi.fn().mockReturnValue([{
        getSize: vi.fn().mockReturnValue({ width: 612, height: 792 }),
        drawText: vi.fn(),
        getRotation: vi.fn().mockReturnValue({ angle: 0 }),
        setRotation: vi.fn(),
      }]),
      embedFont: vi.fn().mockResolvedValue({
        widthOfTextAtSize: vi.fn().mockReturnValue(100),
        heightAtSize: vi.fn().mockReturnValue(12),
      }),
    }),
    load: vi.fn().mockResolvedValue({
      copyPages: vi.fn().mockResolvedValue([{ addPage: vi.fn() }]),
      getPageCount: vi.fn().mockReturnValue(5),
      getPageIndices: vi.fn().mockReturnValue([0, 1, 2, 3, 4]),
      getPages: vi.fn().mockReturnValue([{
        getSize: vi.fn().mockReturnValue({ width: 612, height: 792 }),
        drawText: vi.fn(),
        getRotation: vi.fn().mockReturnValue({ angle: 0 }),
        setRotation: vi.fn(),
      }]),
      embedFont: vi.fn().mockResolvedValue({
        widthOfTextAtSize: vi.fn().mockReturnValue(100),
        heightAtSize: vi.fn().mockReturnValue(12),
      }),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }),
  },
  rgb: vi.fn().mockReturnValue({ r: 0, g: 0, b: 0 }),
  degrees: vi.fn().mockReturnValue({ angle: 90 }),
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'Helvetica-Bold',
  },
}));

describe('pdf library', () => {
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

    it('should throw on invalid inputs', () => {
      expect(() => parsePageRanges('abc, 1-xyz, 2', 10)).toThrow(InvalidPageRangeError);
    });

    it('should throw on completely invalid input', () => {
      expect(() => parsePageRanges('invalid', 10)).toThrow(InvalidPageRangeError);
    });

    it('should throw on empty string', () => {
      expect(() => parsePageRanges('', 10)).toThrow(InvalidPageRangeError);
    });

    it('should handle whitespace', () => {
      expect(parsePageRanges('  1  ,  3  ', 10)).toEqual([0, 2]);
    });
  });

  describe('mergePdfs', () => {
    it('should merge multiple PDFs', async () => {
      const mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
      
      const result = await mergePdfs([mockFile, mockFile]);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(PDFDocument.create).toHaveBeenCalled();
    });
  });

  describe('extractPages', () => {
    it('should extract specified pages', async () => {
      const mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
      
      const result = await extractPages(mockFile, '1-3');
      
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should throw error for invalid pages', async () => {
      const mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
      
      await expect(extractPages(mockFile, '100-200')).rejects.toThrow();
    });
  });

  describe('addWatermark', () => {
    it('should add watermark to PDF', async () => {
      const mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
      
      const result = await addWatermark(mockFile, 'WATERMARK');
      
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('rotatePdf', () => {
    it('should rotate PDF pages', async () => {
      const mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
      
      const result = await rotatePdf(mockFile, 90);
      
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });
});
