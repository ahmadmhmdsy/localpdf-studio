import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repairPdf } from './repair';

vi.mock('pdf-lib', () => {
  const mockPage = {
    getSize: vi.fn().mockReturnValue({ width: 612, height: 792 }),
    setSize: vi.fn(),
    drawText: vi.fn(),
  };
  const mockPdfDoc = {
    getTitle: vi.fn().mockReturnValue(null),
    getAuthor: vi.fn().mockReturnValue(null),
    setTitle: vi.fn(),
    setAuthor: vi.fn(),
    getPages: vi.fn().mockReturnValue([mockPage]),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
  const mockNewPdf = {
    addPage: vi.fn().mockReturnValue(mockPage),
    save: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
  };
  return {
    PDFDocument: {
      load: vi.fn().mockResolvedValue(mockPdfDoc),
      create: vi.fn().mockResolvedValue(mockNewPdf),
    },
  };
});

describe('repair.ts', () => {
  let mockFile: File;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  });

  it('repairs a PDF file', async () => {
    const result = await repairPdf(mockFile);
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Uint8Array);
  });

  it('throws error for invalid PDF', async () => {
    const { PDFDocument } = await import('pdf-lib');
    vi.mocked(PDFDocument.load).mockRejectedValueOnce(new Error('Invalid PDF'));
    
    const invalidFile = new File(['invalid'], 'bad.pdf', { type: 'application/pdf' });
    invalidFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(4));
    
    const result = await repairPdf(invalidFile);
    expect(result.success).toBe(false);
  });
});
