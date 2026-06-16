import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generates a simple PDF file with specified number of pages
 * Each page contains simple text content
 */
export async function generateDummyPdf(
  pageCount: number = 3,
  fileName: string = 'test-document.pdf'
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    
    // Add page number text
    const text = `Page ${i + 1} of ${pageCount}`;
    const fontSize = 24;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Add some content to the page
    const contentText = 'This is a test PDF document for LocalPDF Studio.';
    const contentFontSize = 12;
    const contentWidth = font.widthOfTextAtSize(contentText, contentFontSize);
    
    page.drawText(contentText, {
      x: (width - contentWidth) / 2,
      y: height / 2 - 40,
      size: contentFontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes.buffer as ArrayBuffer], fileName, { type: 'application/pdf' });
}

/**
 * Generates a PDF with a watermark on each page
 */
export async function generateWatermarkedPdf(
  watermark: string = 'WATERMARK',
  pageCount: number = 2
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
    
    // Add watermark
    const fontSize = 48;
    const textWidth = font.widthOfTextAtSize(watermark, fontSize);
    
    page.drawText(watermark, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.3,
    });

    // Add content
    page.drawText(`Page ${i + 1}`, {
      x: 50,
      y: height - 50,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes.buffer as ArrayBuffer], 'watermarked-test.pdf', { type: 'application/pdf' });
}

/**
 * Generates a password-protected PDF
 */
export async function generateProtectedPdf(
  password: string = 'test123'
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  page.drawText('Protected PDF Document', {
    x: 50,
    y: 700,
    size: 20,
    font,
    color: rgb(0, 0, 0),
  });

  // Note: pdf-lib doesn't support creating encrypted PDFs directly
  // This creates a regular PDF that we mark as "should be protected"
  const pdfBytes = await pdfDoc.save();
  const file = new File([pdfBytes.buffer as ArrayBuffer], 'protected-test.pdf', { type: 'application/pdf' });
  // Add metadata marker for tests
  (file as any)._isProtected = true;
  (file as any)._password = password;
  return file;
}

/**
 * Generates a large PDF for compression tests
 */
export async function generateLargePdf(): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Create a PDF with many pages and repeated content
  for (let i = 0; i < 50; i++) {
    const page = pdfDoc.addPage([612, 792]);
    
    // Add lots of text to increase file size
    for (let j = 0; j < 20; j++) {
      page.drawText(`Line ${j}: This is a test line to increase the file size for compression testing. ` +
        `Adding more content here to make this PDF larger. Page ${i + 1} of 50.`, {
        x: 50,
        y: 750 - (j * 30),
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes.buffer as ArrayBuffer], 'large-test.pdf', { type: 'application/pdf' });
}
