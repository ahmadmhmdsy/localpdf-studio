import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repairPdf } from './repair';

const mockPage = vi.hoisted(() => ({
  getSize: vi.fn(),
  setSize: vi.fn(),
  drawText: vi.fn(),
}));

const mockPdfDoc = vi.hoisted(() => ({
  getTitle: vi.fn(),
  getAuthor: vi.fn(),
  setTitle: vi.fn(),
  setAuthor: vi.fn(),
  getPages: vi.fn(),
  save: vi.fn(),
}));

const mockPdfDocument = vi.hoisted(() => ({
  load: vi.fn(),
  create: vi.fn(),
}));

vi.mock('pdf-lib', () => ({
  PDFDocument: mockPdfDocument,
}));

describe('repair.ts', () => {
  let mockFile: File;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPage.getSize.mockReturnValue({ width: 612, height: 792 });
    mockPage.setSize.mockReturnValue(undefined);
    mockPdfDoc.getTitle.mockReturnValue(null);
    mockPdfDoc.getAuthor.mockReturnValue(null);
    mockPdfDoc.getPages.mockReturnValue([mockPage]);
    mockPdfDoc.save.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockPdfDocument.load.mockResolvedValue(mockPdfDoc);
    mockPdfDocument.create.mockResolvedValue({ addPage: vi.fn(), save: vi.fn() });

    mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  });

  it('re-saves a readable PDF and returns the repaired bytes', async () => {
    const result = await repairPdf(mockFile);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(new Uint8Array([1, 2, 3]));
    expect(result.issuesFixed).toContain('Validated PDF structure');
    expect(mockPdfDocument.load).toHaveBeenCalledWith(expect.any(ArrayBuffer), {
      updateMetadata: false,
      ignoreEncryption: true,
    });
  });

  it('adds missing metadata and reports each fix', async () => {
    const result = await repairPdf(mockFile);

    expect(mockPdfDoc.setTitle).toHaveBeenCalledWith('Repaired Document');
    expect(mockPdfDoc.setAuthor).toHaveBeenCalledWith('Unknown');
    expect(result.issuesFixed).toEqual(
      expect.arrayContaining(['Added missing title metadata', 'Added missing author metadata']),
    );
  });

  it('keeps existing metadata untouched', async () => {
    mockPdfDoc.getTitle.mockReturnValue('Existing title');
    mockPdfDoc.getAuthor.mockReturnValue('Existing author');

    const result = await repairPdf(mockFile);

    expect(mockPdfDoc.setTitle).not.toHaveBeenCalled();
    expect(mockPdfDoc.setAuthor).not.toHaveBeenCalled();
    expect(result.issuesFixed).not.toContain('Added missing title metadata');
  });

  it('replaces invalid page dimensions', async () => {
    mockPage.getSize.mockReturnValueOnce({ width: 0, height: 0 });

    const result = await repairPdf(mockFile);

    expect(mockPage.setSize).toHaveBeenCalledWith(612, 792);
    expect(result.issuesFixed).toContain('Fixed invalid page dimensions on page 1');
  });

  it('returns a failure with no data and no placeholder when the PDF cannot be loaded', async () => {
    mockPdfDocument.load.mockRejectedValueOnce(new Error('Invalid PDF structure'));

    const result = await repairPdf(mockFile);

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.issuesFixed).toEqual([]);
    expect(result.message).toMatch(/no repaired file was produced/i);
    // Roadmap A7.9: never fabricate a replacement document.
    expect(mockPdfDocument.create).not.toHaveBeenCalled();
  });

  it('returns a failure with no data when saving the repaired PDF fails', async () => {
    mockPdfDoc.save.mockRejectedValueOnce(new Error('Cannot save document'));

    const result = await repairPdf(mockFile);

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.issuesFixed).toEqual([]);
    expect(mockPdfDocument.create).not.toHaveBeenCalled();
  });

  it('returns a failure with no data when the file cannot be read', async () => {
    mockFile.arrayBuffer = vi.fn().mockRejectedValueOnce(new Error('Read error'));

    const result = await repairPdf(mockFile);

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.issuesFixed).toEqual([]);
  });
});
