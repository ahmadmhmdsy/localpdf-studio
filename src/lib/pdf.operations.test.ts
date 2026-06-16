import { describe, it, expect, vi } from 'vitest';

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      copyPages: vi.fn().mockResolvedValue([{ getSize: () => ({ width: 612, height: 792 }) }]),
      addPage: vi.fn(),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      embedFont: vi.fn().mockResolvedValue({ widthOfTextAtSize: () => 100, heightAtSize: () => 12 }),
      removePage: vi.fn(),
      getPages: () => [{ getSize: () => ({ width: 612, height: 792 }), getRotation: () => ({ angle: 0 }), setRotation: vi.fn(), drawText: vi.fn() }],
      getPageCount: () => 3,
      getPageIndices: () => [0, 1, 2],
    }),
    load: vi.fn().mockResolvedValue({
      copyPages: vi.fn().mockResolvedValue([{ getSize: () => ({ width: 612, height: 792 }) }]),
      addPage: vi.fn(),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      embedFont: vi.fn().mockResolvedValue({ widthOfTextAtSize: () => 100, heightAtSize: () => 12 }),
      removePage: vi.fn(),
      getPages: () => [{ getSize: () => ({ width: 612, height: 792 }), getRotation: () => ({ angle: 0 }), setRotation: vi.fn(), drawText: vi.fn() }],
      getPageCount: () => 3,
      getPageIndices: () => [0, 1, 2],
    }),
  },
  rgb: vi.fn(),
  degrees: vi.fn((v: number) => v),
  StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'Helvetica-Bold' },
}));

describe('mergePdfs', () => {
  it('merges multiple PDF files', async () => {
    const { mergePdfs } = await import('./pdf');
    const file1 = new File(['dummy1'], 'a.pdf', { type: 'application/pdf' });
    const file2 = new File(['dummy2'], 'b.pdf', { type: 'application/pdf' });
    const result = await mergePdfs([file1, file2]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('handles single file', async () => {
    const { mergePdfs } = await import('./pdf');
    const file = new File(['dummy'], 'single.pdf', { type: 'application/pdf' });
    const result = await mergePdfs([file]);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('extractPages', () => {
  it('extracts specific pages by range', async () => {
    const { extractPages } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await extractPages(file, '1-3');
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('extracts specific pages by list', async () => {
    const { extractPages } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await extractPages(file, '1, 3');
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('throws error for invalid page range', async () => {
    const { extractPages } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    await expect(extractPages(file, '10-20')).rejects.toThrow(/Page 10 in range "10-20" is out of bounds/);
  });

  it('throws error for empty range', async () => {
    const { extractPages } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    await expect(extractPages(file, '')).rejects.toThrow(/cannot be empty/);
  });
});

describe('addWatermark', () => {
  it('adds watermark text to PDF', async () => {
    const { addWatermark } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await addWatermark(file, 'CONFIDENTIAL');
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('rotatePdf', () => {
  it('rotates PDF by specified angle', async () => {
    const { rotatePdf } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await rotatePdf(file, 90);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('rotates PDF by 180 degrees', async () => {
    const { rotatePdf } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await rotatePdf(file, 180);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('rotates PDF by 270 degrees', async () => {
    const { rotatePdf } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await rotatePdf(file, 270);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('removePages', () => {
  it('removes specified pages', async () => {
    const { removePages } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await removePages(file, '2');
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('throws error when removing all pages', async () => {
    const { removePages } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    // Mock has 3 pages, so removing all 3 should throw
    await expect(removePages(file, '1, 2, 3')).rejects.toThrow('Cannot remove all pages');
  });

  it('throws error for invalid range', async () => {
    const { removePages } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    await expect(removePages(file, '10-20')).rejects.toThrow(/Page 10 in range "10-20" is out of bounds/);
  });
});

describe('addPageNumbers', () => {
  it('adds page numbers at bottom-center (default)', async () => {
    const { addPageNumbers } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await addPageNumbers(file);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('adds page numbers at top-left', async () => {
    const { addPageNumbers } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await addPageNumbers(file, 'top-left');
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('adds page numbers at top-right', async () => {
    const { addPageNumbers } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await addPageNumbers(file, 'top-right');
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('adds page numbers at bottom-left', async () => {
    const { addPageNumbers } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await addPageNumbers(file, 'bottom-left');
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('adds page numbers at bottom-right', async () => {
    const { addPageNumbers } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await addPageNumbers(file, 'bottom-right');
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('adds page numbers at top-center', async () => {
    const { addPageNumbers } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await addPageNumbers(file, 'top-center');
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('reorderPdfPages', () => {
  it('reorders pages according to new order', async () => {
    const { reorderPdfPages } = await import('./pdf');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await reorderPdfPages(file, [2, 0, 1]);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});
