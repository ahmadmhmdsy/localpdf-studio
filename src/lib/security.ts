import { PDFDocument } from 'pdf-lib';
import { pdfjsLib } from './pdfjs';

export function dataUrlToBytes(dataUrl: string): ArrayBuffer {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid data URL: expected format "data:<mime>;base64,<data>"');
  }
  const base64 = match[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface SignatureAnnotation {
  imageDataUrl: string; // base64 PNG
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  pageIndex: number;
}

export async function signPdf(file: File, signatures: SignatureAnnotation[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);

  const pages = pdf.getPages();

  for (const sig of signatures) {
    if (sig.pageIndex >= 0 && sig.pageIndex < pages.length) {
      const page = pages[sig.pageIndex];
      const { width, height } = page.getSize();

      const imageBytes = dataUrlToBytes(sig.imageDataUrl);
      const embeddedImage = await pdf.embedPng(imageBytes);

      // Convert percentage coordinates to points
      const x = (sig.x / 100) * width;
      const y = height - (sig.y / 100) * height; // PDF y is from bottom
      const imgWidth = (sig.width / 100) * width;
      const imgHeight = (sig.height / 100) * height;

      // Draw image, adjusting y to be the bottom-left corner of the image
      page.drawImage(embeddedImage, {
        x: x - imgWidth / 2,
        y: y - imgHeight / 2,
        width: imgWidth,
        height: imgHeight,
      });
    }
  }

  return await pdf.save();
}

export interface RedactionRect {
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage
  height: number; // percentage
  pageIndex: number;
}

const REDACTION_SCALE = 2; // 2x DPI for high-quality rasterization

async function rasterizePageToPngBytes(
  arrayBuffer: ArrayBuffer,
  pageIndex: number,
  redactionsForPage: RedactionRect[],
): Promise<{ png: Uint8Array; width: number; height: number }> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
  const page = await pdf.getPage(pageIndex + 1);

  const viewport1 = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: REDACTION_SCALE });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire canvas 2D context for redaction.');
  }

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  for (const rect of redactionsForPage) {
    const x = (rect.x / 100) * canvas.width;
    const y = (rect.y / 100) * canvas.height;
    const w = (rect.width / 100) * canvas.width;
    const h = (rect.height / 100) * canvas.height;
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, w, h);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null.'))), 'image/png');
  });
  const png = new Uint8Array(await blob.arrayBuffer());
  // pdfjs 6.x removed PDFDocumentProxy.destroy(); worker cleanup is automatic.
  return { png, width: viewport1.width, height: viewport1.height };
}

export async function redactPdf(file: File, redactions: RedactionRect[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const totalPages = sourcePdf.getPageCount();

  const redactionsByPage = new Map<number, RedactionRect[]>();
  for (const rect of redactions) {
    if (rect.pageIndex >= 0 && rect.pageIndex < totalPages) {
      const list = redactionsByPage.get(rect.pageIndex) ?? [];
      list.push(rect);
      redactionsByPage.set(rect.pageIndex, list);
    }
  }

  const outPdf = await PDFDocument.create();

  for (let i = 0; i < totalPages; i++) {
    const pageRedactions = redactionsByPage.get(i) ?? [];
    if (pageRedactions.length === 0) {
      const [copied] = await outPdf.copyPages(sourcePdf, [i]);
      outPdf.addPage(copied);
      continue;
    }

    const { png, width, height } = await rasterizePageToPngBytes(arrayBuffer, i, pageRedactions);
    const embedded = await outPdf.embedPng(png);
    const newPage = outPdf.addPage([width, height]);
    newPage.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  outPdf.setTitle('');
  outPdf.setAuthor('');
  outPdf.setSubject('');
  outPdf.setKeywords([]);
  outPdf.setProducer('');
  outPdf.setCreator('');

  return await outPdf.save();
}