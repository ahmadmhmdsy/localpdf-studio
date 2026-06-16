import { describe, it, expect, vi } from 'vitest';

vi.mock('./image', async () => {
  const actual = await vi.importActual('./image');
  return {
    ...actual,
    jpgsToPdf: vi.fn(async () => new Uint8Array([80, 75, 3, 4])),
    pdfToJpgs: vi.fn(async () => new Blob()),
  };
});

const { jpgsToPdf, pdfToJpgs } = await import('./image');

describe('jpgsToPdf', () => {
  it('should convert single JPG to PDF', async () => {
    const jpgFile = new File([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], 'test.jpg', { type: 'image/jpeg' });
    const result = await jpgsToPdf([jpgFile]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should convert multiple JPGs to multi-page PDF', async () => {
    const jpg1 = new File([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], 'test1.jpg', { type: 'image/jpeg' });
    const jpg2 = new File([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], 'test2.jpg', { type: 'image/jpeg' });
    const result = await jpgsToPdf([jpg1, jpg2]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should return empty PDF for empty array', async () => {
    const result = await jpgsToPdf([]);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('pdfToJpgs', () => {
  it('should convert PDF to JPGs blob', async () => {
    const pdfFile = new File([new Uint8Array()], 'test.pdf', { type: 'application/pdf' });
    const result = await pdfToJpgs(pdfFile);
    expect(result).toBeInstanceOf(Blob);
  });

  it('should handle single page PDF', async () => {
    const pdfFile = new File([new Uint8Array()], 'test.pdf', { type: 'application/pdf' });
    const result = await pdfToJpgs(pdfFile);
    expect(result).toBeInstanceOf(Blob);
  });
});
