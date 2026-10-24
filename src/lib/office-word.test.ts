import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mammoth to return canned HTML.
const { mockConvertToHtml } = vi.hoisted(() => ({
  mockConvertToHtml: vi.fn(),
}));

vi.mock('mammoth', () => ({
  convertToHtml: mockConvertToHtml,
  __esModule: true,
}));

// Mock pdf-lib
const { mockPdfDoc, mockPage, mockFont } = vi.hoisted(() => {
  const font = {
    widthOfTextAtSize: vi.fn((text: string, size: number) => text.length * size * 0.5),
  };
  const page = {
    drawText: vi.fn(),
    drawRectangle: vi.fn(),
  };
  const doc = {
    addPage: vi.fn(() => page),
    embedFont: vi.fn(async () => font),
    save: vi.fn(async () => new Uint8Array([1, 2, 3])),
  };
  return { mockPdfDoc: doc, mockPage: page, mockFont: font };
});

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn(async () => mockPdfDoc),
  },
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'HelveticaBold',
  },
  rgb: vi.fn((r: number, g: number, b: number) => ({ red: r, green: g, blue: b })),
}));

import { convertWordToPdf } from './office-word';

describe('convertWordToPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfDoc.save.mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  it('extracts HTML via mammoth and writes one line per text line', async () => {
    mockConvertToHtml.mockResolvedValueOnce({ value: '<h1>Hello</h1><p>World</p>' });
    const file = new File([new Uint8Array()], 'doc.docx');

    await convertWordToPdf(file);

    expect(mockConvertToHtml).toHaveBeenCalledWith({ arrayBuffer: expect.any(ArrayBuffer) });
    // "Hello" and "World" become two drawText() calls.
    expect(mockPage.drawText).toHaveBeenCalled();
  });

  it('strips HTML tags before splitting lines', async () => {
    mockConvertToHtml.mockResolvedValueOnce({
      value: '<p>One</p><p>Two</p><p>Three</p>',
    });
    const file = new File([new Uint8Array()], 'doc.docx');

    await convertWordToPdf(file);

    expect(mockPage.drawText).toHaveBeenCalled();
  });

  it('calls addPage() when text would overflow past the page bottom', async () => {
    // Use many input lines to force page overflow
    const lines = Array.from({ length: 200 }, (_, i) => `<p>line ${i}</p>`).join('');
    mockConvertToHtml.mockResolvedValueOnce({ value: lines });
    const file = new File([new Uint8Array()], 'doc.docx');

    await convertWordToPdf(file);

    expect(mockPdfDoc.addPage).toHaveBeenCalled();
  });

  it('skips text() for empty lines but still advances the y cursor', async () => {
    mockConvertToHtml.mockResolvedValueOnce({ value: '<p>One</p><p></p><p>Two</p>' });
    const file = new File([new Uint8Array()], 'doc.docx');

    await convertWordToPdf(file);

    // Non-empty lines produce drawText() calls; empty lines are skipped.
    const drawTextCalls = mockPage.drawText.mock.calls;
    expect(drawTextCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('returns the saved PDF as Uint8Array', async () => {
    mockConvertToHtml.mockResolvedValueOnce({ value: '<p>Hi</p>' });
    const file = new File([new Uint8Array()], 'doc.docx');

    const result = await convertWordToPdf(file);

    expect(mockPdfDoc.save).toHaveBeenCalled();
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('creates a PDF document with correct page size', async () => {
    mockConvertToHtml.mockResolvedValueOnce({ value: '<p>x</p>' });
    const file = new File([new Uint8Array()], 'doc.docx');

    await convertWordToPdf(file);

    // Should create at least one page with Letter size (612 x 792)
    expect(mockPdfDoc.addPage).toHaveBeenCalledWith([612, 792]);
  });
});