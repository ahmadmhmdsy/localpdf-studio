import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

vi.mock('./pdfjs', () => ({
  pdfjsLib: {
    getDocument: vi.fn(),
  },
}));

import { compressPdf } from './compress';

describe('compressPdf integration', () => {
  it('compresses a PDF at low level', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test content for compression', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'test.pdf', { type: 'application/pdf' });

    const result = await compressPdf(file, 'low');

    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('compresses a PDF at high level', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test content for compression', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'test.pdf', { type: 'application/pdf' });

    const result = await compressPdf(file, 'high');

    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('produces valid PDF output after compression', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test content', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'test.pdf', { type: 'application/pdf' });

    const result = await compressPdf(file, 'medium');

    // Verify the compressed output is a valid PDF
    const compressedPdf = await PDFDocument.load(result.bytes);
    expect(compressedPdf.getPageCount()).toBe(1);
  });

  it('includes compression notes in the result', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test content', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'test.pdf', { type: 'application/pdf' });

    const result = await compressPdf(file, 'low');

    // Notes say whether images were touched
    const hasImageNote = result.notes.some(n => /Images/.test(n));
    expect(hasImageNote).toBe(true);
  });
});
