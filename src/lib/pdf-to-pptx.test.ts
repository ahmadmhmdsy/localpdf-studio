import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetPage, mockGetDocument } = vi.hoisted(() => {
  const mockGetPage = vi.fn();
  const mockGetDocument = vi.fn(() => ({
    promise: Promise.resolve({ getPage: mockGetPage, numPages: 1 }),
  }));
  return { mockGetPage, mockGetDocument };
});

vi.mock('pdfjs-dist', () => ({
  __esModule: true,
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: mockGetDocument,
}));

vi.mock('./pdfjs', () => ({
  pdfjsLib: { getDocument: mockGetDocument },
}));

const { mockGenerateAsync, mockZipInstance, mockThumbnail } = vi.hoisted(() => {
  // JPEG data URL (1x1 pixel)
  const t = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=';
  return {
    mockGenerateAsync: vi.fn(),
    mockZipInstance: {
      file: vi.fn(),
      generateAsync: vi.fn(),
    },
    mockThumbnail: t,
  };
});

vi.mock('jszip', () => {
  function JSZip(this: unknown) {
    return {
      file: mockZipInstance.file,
      generateAsync: mockZipInstance.generateAsync,
    };
  }
  (JSZip as unknown as { loadAsync: unknown }).loadAsync = undefined;
  return { __esModule: true, default: JSZip };
});

vi.mock('./image', () => ({
  getPdfPageThumbnails: vi.fn(async () => [mockThumbnail, mockThumbnail]),
}));

import { convertPdfToPowerpoint } from './pdf-to-pptx';

describe('convertPdfToPowerpoint', () => {
  beforeEach(() => {
    mockZipInstance.file.mockReset();
    mockZipInstance.generateAsync.mockReset();
    mockGenerateAsync.mockReset();
    mockZipInstance.generateAsync.mockImplementation((opts: unknown) => mockGenerateAsync(opts));
    mockGenerateAsync.mockResolvedValue(new Blob(['pptx'], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
    mockGetPage.mockReset();
  });

  it('returns a PowerPoint (pptx) Blob', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    const result = await convertPdfToPowerpoint(file);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toContain('presentationml');
  });

  it('calls zip.file for [Content_Types].xml', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const names = mockZipInstance.file.mock.calls.map((c) => c[0]);
    expect(names).toContain('[Content_Types].xml');
  });

  it('writes one slide XML per page in the PDF', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const slideNames = mockZipInstance.file.mock.calls
      .map((c) => c[0])
      .filter((n: unknown) => typeof n === 'string' && /^ppt\/slides\/slide\d+\.xml$/.test(n as string));
    expect(slideNames).toHaveLength(2);
  });

  it('writes one JPEG image per page (not PNG)', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const jpgNames = mockZipInstance.file.mock.calls
      .map((c) => c[0])
      .filter((n: unknown) => typeof n === 'string' && /^ppt\/media\/image\d+\.jpg$/.test(n as string));
    expect(jpgNames).toHaveLength(2);
  });

  it('does NOT write PNG images', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const pngNames = mockZipInstance.file.mock.calls
      .map((c) => c[0])
      .filter((n: unknown) => typeof n === 'string' && /^ppt\/media\/image\d+\.png$/.test(n as string));
    expect(pngNames).toHaveLength(0);
  });

  it('declares JPEG content type in [Content_Types].xml', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const contentTypesCall = mockZipInstance.file.mock.calls.find(
      (c: unknown[]) => c[0] === '[Content_Types].xml'
    );
    expect(contentTypesCall).toBeDefined();
    const contentTypesXml = contentTypesCall![1] as string;
    expect(contentTypesXml).toContain('Extension="jpg"');
    expect(contentTypesXml).toContain('ContentType="image/jpeg"');
    expect(contentTypesXml).not.toContain('Extension="png"');
  });

  it('includes slide master XML', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const names = mockZipInstance.file.mock.calls.map((c) => c[0]);
    expect(names).toContain('ppt/slideMaster/slideMaster1.xml');
  });

  it('includes slide layout XML', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const names = mockZipInstance.file.mock.calls.map((c) => c[0]);
    expect(names).toContain('ppt/slideLayout/slideLayout1.xml');
  });

  it('includes slide master relationships', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const names = mockZipInstance.file.mock.calls.map((c) => c[0]);
    expect(names).toContain('ppt/slideMaster/_rels/slideMaster1.xml.rels');
  });

  it('includes slide layout relationships', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const names = mockZipInstance.file.mock.calls.map((c) => c[0]);
    expect(names).toContain('ppt/slideLayout/_rels/slideLayout1.xml.rels');
  });

  it('slide relationships reference .jpg files', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const relsCall = mockZipInstance.file.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && /^ppt\/slides\/_rels\/slide1\.xml\.rels$/.test(c[0])
    );
    expect(relsCall).toBeDefined();
    const relsXml = relsCall![1] as string;
    expect(relsXml).toContain('.jpg');
    expect(relsXml).not.toContain('.png');
  });

  it('generates a blob via generateAsync', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    expect(mockGenerateAsync).toHaveBeenCalledWith({ type: 'blob' });
  });
});
