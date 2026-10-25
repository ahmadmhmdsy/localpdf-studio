import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { pdfjsLib } from './pdfjs';
import {
  CENTIMETRES_PER_INCH,
  DEFAULT_FIT,
  DEFAULT_IMAGE_DPI,
  DEFAULT_PAGE_SIZE,
  FIXED_PAGE_SIZES,
  MAX_IMAGE_DPI,
  METRES_PER_INCH,
  MIN_IMAGE_DPI,
  PDF_POINTS_PER_INCH,
} from '../constants/jpgToPdf';

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

export type ImageFormat = 'jpeg' | 'png';
export type ImagePageSize = 'image' | 'a4' | 'letter';
export type ImageFit = 'fill' | 'contain';

export interface ImageDpi {
  xDpi: number;
  yDpi: number;
}

/** Page box and image box, all in PDF points. */
export interface ImagePlacement {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImagesToPdfOptions {
  /** 'image' (default) sizes every page to the image's own box; 'a4'/'letter' use a fixed page. */
  pageSize?: ImagePageSize;
  /** How a fixed page size is filled: contain keeps proportions and adds margins, fill stretches. */
  fit?: ImageFit;
}

export interface ImagesToPdfResult {
  bytes: Uint8Array;
  /** Names of inputs that were not added to the PDF (unsupported format or unreadable bytes). */
  skipped: string[];
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const JPEG_APP0_MARKER = 0xe0;
const JPEG_SOS_MARKER = 0xda;
const JPEG_EOI_MARKER = 0xd9;

const PNG_PHYS_CHUNK = 'pHYs';
const PNG_IDAT_CHUNK = 'IDAT';
const PNG_IEND_CHUNK = 'IEND';
/** pHYs unit byte: 1 = pixels per metre. A value of 0 means "unknown, aspect ratio only". */
const PNG_PHYS_UNIT_METRE = 1;

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
  );
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let text = '';
  for (let i = 0; i < length; i++) text += String.fromCharCode(bytes[offset + i]);
  return text;
}

/**
 * Detect the real image format from its magic bytes. File.type is not reliable:
 * desktop/Tauri file pickers can hand over files with an empty MIME type.
 */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (JPEG_SIGNATURE.every((value, index) => bytes[index] === value)) return 'jpeg';
  if (PNG_SIGNATURE.every((value, index) => bytes[index] === value)) return 'png';
  return null;
}

/** JFIF APP0 density; units 1 = DPI, units 2 = dots/cm, units 0 = aspect ratio only. */
function readJpegDensity(bytes: Uint8Array): ImageDpi | null {
  let offset = 2; // skip SOI

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2; // standalone marker, no payload
      continue;
    }
    if (marker === JPEG_SOS_MARKER || marker === JPEG_EOI_MARKER) break;

    const segmentLength = readUint16BE(bytes, offset + 2);
    if (segmentLength < 2) break;

    if (marker === JPEG_APP0_MARKER && segmentLength >= 16 && offset + 16 <= bytes.length) {
      const isJfif =
        bytes[offset + 4] === 0x4a && // J
        bytes[offset + 5] === 0x46 && // F
        bytes[offset + 6] === 0x49 && // I
        bytes[offset + 7] === 0x46 && // F
        bytes[offset + 8] === 0x00;
      if (isJfif) {
        const units = bytes[offset + 11];
        if (units === 1) {
          return { xDpi: readUint16BE(bytes, offset + 12), yDpi: readUint16BE(bytes, offset + 14) };
        }
        if (units === 2) {
          return {
            xDpi: readUint16BE(bytes, offset + 12) * CENTIMETRES_PER_INCH,
            yDpi: readUint16BE(bytes, offset + 14) * CENTIMETRES_PER_INCH,
          };
        }
        return null;
      }
    }

    offset += 2 + segmentLength;
  }

  return null;
}

/** PNG pHYs density (pixels per metre); chunk must appear before the image data. */
function readPngDensity(bytes: Uint8Array): ImageDpi | null {
  let offset = PNG_SIGNATURE.length;

  while (offset + 12 <= bytes.length) {
    const chunkLength = readUint32BE(bytes, offset);
    const chunkType = readAscii(bytes, offset + 4, 4);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + chunkLength + 4; // chunk data + CRC

    if (nextOffset > bytes.length) return null; // truncated chunk

    if (chunkType === PNG_PHYS_CHUNK && chunkLength >= 9) {
      if (bytes[dataOffset + 8] !== PNG_PHYS_UNIT_METRE) return null;
      return {
        xDpi: readUint32BE(bytes, dataOffset) * METRES_PER_INCH,
        yDpi: readUint32BE(bytes, dataOffset + 4) * METRES_PER_INCH,
      };
    }

    if (chunkType === PNG_IDAT_CHUNK || chunkType === PNG_IEND_CHUNK) return null;
    offset = nextOffset;
  }

  return null;
}

function clampImageDpi(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return DEFAULT_IMAGE_DPI;
  return Math.min(MAX_IMAGE_DPI, Math.max(MIN_IMAGE_DPI, value));
}

/**
 * Resolve the DPI the page geometry should use: the density stored in the image
 * (JFIF / pHYs), clamped to sane bounds, or DEFAULT_IMAGE_DPI when absent.
 */
export function resolveImageDpi(bytes: Uint8Array): ImageDpi {
  const format = detectImageFormat(bytes);
  const density =
    format === 'jpeg' ? readJpegDensity(bytes) : format === 'png' ? readPngDensity(bytes) : null;
  return {
    xDpi: clampImageDpi(density?.xDpi),
    yDpi: clampImageDpi(density?.yDpi),
  };
}

function pixelsToPoints(pixels: number, dpi: number): number {
  return (pixels * PDF_POINTS_PER_INCH) / dpi;
}

/**
 * Work out the page box and the image box (in PDF points) for one image.
 * 'image' pages use the image's own box; fixed page sizes either contain the
 * image (centred, equal margins) or fill the page.
 */
export function computeImagePlacement(
  imageWidthPx: number,
  imageHeightPx: number,
  dpi: ImageDpi,
  options: ImagesToPdfOptions = {}
): ImagePlacement {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const fit = options.fit ?? DEFAULT_FIT;

  const imageWidth = pixelsToPoints(imageWidthPx, dpi.xDpi);
  const imageHeight = pixelsToPoints(imageHeightPx, dpi.yDpi);

  if (pageSize === 'image') {
    return {
      pageWidth: imageWidth,
      pageHeight: imageHeight,
      x: 0,
      y: 0,
      width: imageWidth,
      height: imageHeight,
    };
  }

  const page = FIXED_PAGE_SIZES[pageSize];

  if (fit === 'contain') {
    const scale = Math.min(page.width / imageWidth, page.height / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    return {
      pageWidth: page.width,
      pageHeight: page.height,
      x: (page.width - width) / 2,
      y: (page.height - height) / 2,
      width,
      height,
    };
  }

  return {
    pageWidth: page.width,
    pageHeight: page.height,
    x: 0,
    y: 0,
    width: page.width,
    height: page.height,
  };
}

function skippedImagesError(skipped: string[]): Error {
  return new Error(
    `Could not convert these files because they could not be read as JPEG or PNG images: ${skipped.join(', ')}`
  );
}

/**
 * Convert images to one PDF, reporting inputs that could not be added. Format is
 * detected from magic bytes, so files with an empty MIME type still convert;
 * unsupported or unreadable inputs are named in `skipped` instead of vanishing.
 * Throws when none of the inputs could be converted (no placeholder PDF).
 */
export async function convertImagesToPdf(
  files: File[],
  options: ImagesToPdfOptions = {}
): Promise<ImagesToPdfResult> {
  const pdfDoc = await PDFDocument.create();
  const skipped: string[] = [];

  for (const file of files) {
    try {
      const imageBytes = new Uint8Array(await file.arrayBuffer());
      const format = detectImageFormat(imageBytes);
      if (!format) {
        skipped.push(file.name);
        continue;
      }

      const image =
        format === 'jpeg' ? await pdfDoc.embedJpg(imageBytes) : await pdfDoc.embedPng(imageBytes);
      const placement = computeImagePlacement(image.width, image.height, resolveImageDpi(imageBytes), options);
      const page = pdfDoc.addPage([placement.pageWidth, placement.pageHeight]);
      page.drawImage(image, {
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      });
    } catch {
      // Bytes can pass the magic-byte check and still fail to decode (truncated
      // file, wrong codec); report the file instead of dropping it silently.
      skipped.push(file.name);
    }
  }

  if (files.length > 0 && skipped.length === files.length) {
    throw skippedImagesError(skipped);
  }

  return { bytes: await pdfDoc.save(), skipped };
}

/**
 * Backward-compatible entry point that returns the PDF bytes only.
 *
 * Kept for existing callers (Scan to PDF) that embed images and expect a
 * Uint8Array. If any input is skipped it throws, so a file is never dropped
 * without a trace; callers that need the skipped list use
 * {@link convertImagesToPdf}.
 */
export async function jpgsToPdf(files: File[], options: ImagesToPdfOptions = {}): Promise<Uint8Array> {
  const { bytes, skipped } = await convertImagesToPdf(files, options);
  if (skipped.length > 0) throw skippedImagesError(skipped);
  return bytes;
}
