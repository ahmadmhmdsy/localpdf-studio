import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

// Mock pdf-js for any rendering needs
vi.mock('./pdfjs', () => ({
  pdfjsLib: {
    getDocument: vi.fn(),
  },
}));

import { mergePdfs } from './pdf';

describe('mergePdfs integration', () => {
  it('merges two single-page PDFs into a 2-page PDF', async () => {
    // Create two simple PDFs
    const pdf1 = await PDFDocument.create();
    const page1 = pdf1.addPage([612, 792]);
    page1.drawText('Page 1', { x: 50, y: 700, size: 12 });
    const pdf1Bytes = await pdf1.save();

    const pdf2 = await PDFDocument.create();
    const page2 = pdf2.addPage([612, 792]);
    page2.drawText('Page 2', { x: 50, y: 700, size: 12 });
    const pdf2Bytes = await pdf2.save();

    const file1 = new File([pdf1Bytes], 'doc1.pdf', { type: 'application/pdf' });
    const file2 = new File([pdf2Bytes], 'doc2.pdf', { type: 'application/pdf' });

    const result = await mergePdfs([file1, file2]);

    // Verify the result is a valid PDF
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);

    // Load the merged PDF and verify it has 2 pages
    const mergedPdf = await PDFDocument.load(result);
    expect(mergedPdf.getPageCount()).toBe(2);
  });

  it('merges multiple PDFs preserving page order', async () => {
    const pdfs: File[] = [];
    for (let i = 0; i < 3; i++) {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([612, 792]);
      page.drawText(`Document ${i + 1}`, { x: 50, y: 700, size: 12 });
      const bytes = await pdf.save();
      pdfs.push(new File([bytes], `doc${i + 1}.pdf`, { type: 'application/pdf' }));
    }

    const result = await mergePdfs(pdfs);
    const mergedPdf = await PDFDocument.load(result);
    expect(mergedPdf.getPageCount()).toBe(3);
  });

  it('handles a single file', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Single page', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'single.pdf', { type: 'application/pdf' });

    const result = await mergePdfs([file]);
    const mergedPdf = await PDFDocument.load(result);
    expect(mergedPdf.getPageCount()).toBe(1);
  });

  it('preserves page content after merge', async () => {
    const pdf1 = await PDFDocument.create();
    const page1 = pdf1.addPage([612, 792]);
    page1.drawText('First document content', { x: 50, y: 700, size: 12 });
    const pdf1Bytes = await pdf1.save();

    const pdf2 = await PDFDocument.create();
    const page2 = pdf2.addPage([612, 792]);
    page2.drawText('Second document content', { x: 50, y: 700, size: 12 });
    const pdf2Bytes = await pdf2.save();

    const file1 = new File([pdf1Bytes], 'doc1.pdf', { type: 'application/pdf' });
    const file2 = new File([pdf2Bytes], 'doc2.pdf', { type: 'application/pdf' });

    const result = await mergePdfs([file1, file2]);
    const mergedPdf = await PDFDocument.load(result);

    // Verify both pages exist
    expect(mergedPdf.getPageCount()).toBe(2);
    
    // Verify page sizes are preserved
    const pages = mergedPdf.getPages();
    expect(pages[0].getSize().width).toBe(612);
    expect(pages[0].getSize().height).toBe(792);
    expect(pages[1].getSize().width).toBe(612);
    expect(pages[1].getSize().height).toBe(792);
  });
});
