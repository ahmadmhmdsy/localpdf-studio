import { describe, it, expect } from 'vitest';
import { jpgsToPdf, pdfToJpgs } from './image';
import { generateDummyImage } from '../tests/fixtures/imageGenerator';
import { generateDummyPdf } from '../tests/fixtures/pdfGenerator';

describe('jpgsToPdf', () => {
  it('should convert single JPG to PDF', async () => {
    const jpgFile = generateDummyImage();
    const result = await jpgsToPdf([jpgFile]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should convert multiple JPGs to multi-page PDF', async () => {
    const jpg1 = generateDummyImage('test1.jpg');
    const jpg2 = generateDummyImage('test2.jpg');
    const result = await jpgsToPdf([jpg1, jpg2]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should throw on empty array', async () => {
    await expect(jpgsToPdf([])).rejects.toThrow();
  });
});

describe('pdfToJpgs', () => {
  it('should convert multi-page PDF to array of JPGs', async () => {
    const pdfFile = await generateDummyPdf(3);
    const result = await pdfToJpgs(pdfFile);
    expect(result).toBeInstanceOf(Blob);
  });

  it('should handle single page PDF', async () => {
    const pdfFile = await generateDummyPdf(1);
    const result = await pdfToJpgs(pdfFile);
    expect(result).toBeInstanceOf(Blob);
  });
});
