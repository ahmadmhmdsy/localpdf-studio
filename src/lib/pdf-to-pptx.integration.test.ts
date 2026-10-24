import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

// Mock pdfjs to return a proper promise with render method
vi.mock('./pdfjs', () => ({
  pdfjsLib: {
    getDocument: vi.fn(() => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn(() => Promise.resolve({
          getViewport: vi.fn(() => ({ width: 612, height: 792 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        })),
      }),
    })),
  },
}));

// Mock canvas - return different number of thumbnails based on file
vi.mock('./image', () => ({
  getPdfPageThumbnails: vi.fn((file: File) => {
    // Return 3 thumbnails for multi-page test, 1 for others
    const count = file.name.includes('multi') ? 3 : 1;
    const thumbnails = Array.from({ length: count }, () => 
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q=='
    );
    return Promise.resolve(thumbnails);
  }),
}));

import { convertPdfToPowerpoint } from './pdf-to-pptx';

describe('pdf-to-pptx integration', () => {
  it('converts a single-page PDF to PPTX', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test slide content', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'test.pdf', { type: 'application/pdf' });

    const result = await convertPdfToPowerpoint(file);

    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBeGreaterThan(0);
  });

  it('produces a valid PPTX file that can be unzipped', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test slide', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'test.pdf', { type: 'application/pdf' });

    const result = await convertPdfToPowerpoint(file);

    // Verify the output is a valid ZIP file (PPTX is a ZIP archive)
    const arrayBuffer = await result.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    expect(zip).toBeDefined();
  });

  it('includes required PPTX structure files', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test slide', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'test.pdf', { type: 'application/pdf' });

    const result = await convertPdfToPowerpoint(file);
    const arrayBuffer = await result.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Check for required PPTX files
    expect(zip.file('[Content_Types].xml')).toBeTruthy();
    expect(zip.file('ppt/presentation.xml')).toBeTruthy();
    expect(zip.file('ppt/slides/slide1.xml')).toBeTruthy();
  });

  it('handles multi-page PDFs', async () => {
    const pdf = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
      const page = pdf.addPage([612, 792]);
      page.drawText(`Slide ${i + 1}`, { x: 50, y: 700, size: 12 });
    }
    const bytes = await pdf.save();
    const file = new File([bytes], 'multi-page.pdf', { type: 'application/pdf' });

    const result = await convertPdfToPowerpoint(file);
    const arrayBuffer = await result.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Should have 3 slides
    expect(zip.file('ppt/slides/slide1.xml')).toBeTruthy();
    expect(zip.file('ppt/slides/slide2.xml')).toBeTruthy();
    expect(zip.file('ppt/slides/slide3.xml')).toBeTruthy();
  });
});
