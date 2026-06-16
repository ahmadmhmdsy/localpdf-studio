import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { jpgsToPdf, getPdfPageThumbnails, getPdfPageThumbnail } from './image';

vi.mock('pdf-lib', () => {
  const mockPage = { drawImage: vi.fn() };
  const mockPdfDoc = {
    embedJpg: vi.fn().mockResolvedValue({ width: 400, height: 300 }),
    embedPng: vi.fn().mockResolvedValue({ width: 400, height: 300 }),
    addPage: vi.fn(() => mockPage),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
  return {
    PDFDocument: {
      create: vi.fn().mockResolvedValue(mockPdfDoc),
    },
  };
});

vi.mock('./pdfjs', () => {
  const fakePage = {
    getViewport: vi.fn(({ scale }: { scale: number }) => ({
      width: 100 * scale,
      height: 100 * scale,
    })),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  };
  return {
    pdfjsLib: {
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({
          numPages: 3,
          getPage: vi.fn().mockResolvedValue(fakePage),
        }),
      })),
      GlobalWorkerOptions: { workerSrc: '' },
    },
  };
});

beforeAll(() => {
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => 'data:image/jpeg;base64,mock'
  ) as unknown as typeof HTMLCanvasElement.prototype.toDataURL;
});

describe('jpgsToPdf', () => {
  it('converts JPG files to PDF', async () => {
    const jpgFile = new File([new Uint8Array([0xFF, 0xD8, 0xFF])], 'image.jpg', { type: 'image/jpeg' });
    const result = await jpgsToPdf([jpgFile]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('converts PNG files to PDF', async () => {
    const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4E, 0x47])], 'image.png', { type: 'image/png' });
    const result = await jpgsToPdf([pngFile]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('converts multiple images to PDF', async () => {
    const jpgFile = new File([new Uint8Array([0xFF, 0xD8, 0xFF])], 'image1.jpg', { type: 'image/jpeg' });
    const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4E, 0x47])], 'image2.png', { type: 'image/png' });
    const result = await jpgsToPdf([jpgFile, pngFile]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('skips unsupported image types', async () => {
    const gifFile = new File(['dummy'], 'image.gif', { type: 'image/gif' });
    const jpgFile = new File([new Uint8Array([0xFF, 0xD8, 0xFF])], 'image.jpg', { type: 'image/jpeg' });
    const result = await jpgsToPdf([gifFile, jpgFile]);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('handles empty file array', async () => {
    const result = await jpgsToPdf([]);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('getPdfPageThumbnail', () => {
  it('returns a single-page thumbnail as a data URL', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
    const result = await getPdfPageThumbnail(file, 1);
    expect(result).toBe('data:image/jpeg;base64,mock');
  });

  it('honors a custom scale', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
    await expect(getPdfPageThumbnail(file, 1, 1.5)).resolves.toBeTruthy();
  });
});

describe('getPdfPageThumbnails', () => {
  it('returns a data URL for every page', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
    const result = await getPdfPageThumbnails(file);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('data:image/jpeg;base64,mock');
  });

  it('invokes onPage callback for streaming consumers', async () => {
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
    const onPage = vi.fn();
    await getPdfPageThumbnails(file, { onPage });
    expect(onPage).toHaveBeenCalledTimes(3);
    expect(onPage).toHaveBeenNthCalledWith(1, 'data:image/jpeg;base64,mock', 1);
    expect(onPage).toHaveBeenNthCalledWith(2, 'data:image/jpeg;base64,mock', 2);
    expect(onPage).toHaveBeenNthCalledWith(3, 'data:image/jpeg;base64,mock', 3);
  });
});
