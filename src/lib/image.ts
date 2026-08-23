import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { pdfjsLib } from './pdfjs';

const THUMBNAIL_SCALE = 0.5;
const THUMBNAIL_QUALITY = 0.7;
const THUMBNAIL_FORMAT = 'image/jpeg' as const;

export async function pdfToJpgs(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();

  // Load PDF using pdf.js
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const zip = new JSZip();

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // Scale for better quality

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) throw new Error("Could not create canvas context");

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    }).promise;

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });

    if (blob) {
      zip.file(`page_${i}.jpg`, blob);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

export async function getPdfPageThumbnail(
  file: File,
  pageNumber: number,
  scale: number = THUMBNAIL_SCALE
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create canvas context');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport,
    canvas: canvas
  }).promise;

  return canvas.toDataURL(THUMBNAIL_FORMAT, THUMBNAIL_QUALITY);
}

export async function getPdfPageThumbnails(
  file: File,
  options: { onPage?: (dataUrl: string, pageNumber: number) => void } = {}
): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();

  // Load PDF using pdf.js
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const thumbnails: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    // Use a smaller scale for thumbnails to save memory and process faster
    const viewport = page.getViewport({ scale: THUMBNAIL_SCALE });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) throw new Error("Could not create canvas context");

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    }).promise;

    const dataUrl = canvas.toDataURL(THUMBNAIL_FORMAT, THUMBNAIL_QUALITY);
    thumbnails.push(dataUrl);
    options.onPage?.(dataUrl, i);

    // Yield to event loop so the UI stays responsive on large PDFs.
    if (i < numPages) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  return thumbnails;
}

export async function jpgsToPdf(files: File[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const imageBytes = await file.arrayBuffer();

    let image;
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (file.type === 'image/png') {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      continue; // Skip unsupported image types
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  return await pdfDoc.save();
}