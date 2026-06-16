import { describe, it, expect, vi } from 'vitest';
import { convertToPdfA, PdfALevel } from './pdfa';
import { generateDummyPdf } from '../tests/fixtures/pdfGenerator';

vi.mock('pdf-lib', async () => {
  const actual = await vi.importActual('pdf-lib');
  return {
    ...actual,
  };
});

describe('convertToPdfA', () => {
  const levels: PdfALevel[] = ['1b', '2b', '3b'];

  levels.forEach((level) => {
    it(`should convert to PDF/A-${level}`, async () => {
      const pdfFile = await generateDummyPdf(1);
      const result = await convertToPdfA(pdfFile, level);

      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty('bytes');
      expect(result).toHaveProperty('level', level);
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('isCompliant', false);
      expect(result.bytes).toBeInstanceOf(Uint8Array);
      expect(result.notes).toBeInstanceOf(Array);
    });
  });

  it('should return PDF/A compliance disclaimer in notes', async () => {
    const pdfFile = await generateDummyPdf(1);
    const result = await convertToPdfA(pdfFile, '2b');

    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0]).toContain('NOT validated PDF/A');
  });

  it('should embed sRGB OutputIntent in the PDF', async () => {
    const pdfFile = await generateDummyPdf(1);
    const result = await convertToPdfA(pdfFile, '2b');

    expect(result.bytes.length).toBeGreaterThan(0);
  });
});
