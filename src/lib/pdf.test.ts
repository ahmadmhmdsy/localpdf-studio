import { describe, it, expect } from 'vitest';
import { parsePageRanges, InvalidPageRangeError, reorderPdfPages, addPageNumbers } from './pdf';
import { generateDummyPdf } from '../tests/fixtures/pdfGenerator';

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
  const positions = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const;

  positions.forEach(position => {
    it(`should add page numbers at ${position}`, async () => {
      const pdfFile = await generateDummyPdf(3);
      const result = await addPageNumbers(pdfFile, position);
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });
});
