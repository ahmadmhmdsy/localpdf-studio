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
  const t = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
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

  it('writes one PNG per page', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    const pngNames = mockZipInstance.file.mock.calls
      .map((c) => c[0])
      .filter((n: unknown) => typeof n === 'string' && /^ppt\/media\/image\d+\.png$/.test(n as string));
    expect(pngNames).toHaveLength(2);
  });

  it('generates a blob via generateAsync', async () => {
    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToPowerpoint(file);
    expect(mockGenerateAsync).toHaveBeenCalledWith({ type: 'blob' });
  });
});
