import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  HTML_TO_PDF_BACKGROUND_COLOR,
  HTML_TO_PDF_JPEG_QUALITY,
  HTML_TO_PDF_PIXEL_RATIO,
  HTML_TO_PDF_RENDER_HEIGHT_PX,
  HTML_TO_PDF_RENDER_WIDTH_PX,
} from '../constants/htmlToPdf';

export type HtmlToPdfOrientation = 'portrait' | 'landscape';

export interface PageSizePx {
  widthPx: number;
  heightPx: number;
}

export interface PageSlice {
  /** Zero-based page index. */
  index: number;
  /** Distance from the top of the rendered document, in CSS px. */
  offsetYPx: number;
  /** Captured height in CSS px; the last slice is clipped to the remaining content. */
  heightPx: number;
}

export interface PagePlan {
  orientation: HtmlToPdfOrientation;
  pageSize: PageSizePx;
  /** Height of a full page slice; also the distance between two slice offsets. */
  sliceHeightPx: number;
  contentHeightPx: number;
  pageCount: number;
  slices: PageSlice[];
}

export interface HtmlToPdfOptions {
  orientation?: HtmlToPdfOrientation;
}

export interface HtmlToPdfResult {
  blob: Blob;
  pageCount: number;
}

/**
 * A4 page size in CSS pixels for the requested orientation. Landscape simply
 * swaps width and height, so the captured slices stay the size of the page.
 */
export function getPageDimensions(orientation: HtmlToPdfOrientation): PageSizePx {
  if (orientation === 'landscape') {
    return { widthPx: HTML_TO_PDF_RENDER_HEIGHT_PX, heightPx: HTML_TO_PDF_RENDER_WIDTH_PX };
  }
  return { widthPx: HTML_TO_PDF_RENDER_WIDTH_PX, heightPx: HTML_TO_PDF_RENDER_HEIGHT_PX };
}

/**
 * Number of A4 pages needed to show the measured content. Returns 0 for
 * empty/unknown content so callers can fail clearly instead of emitting a
 * blank page.
 */
export function getPageCount(contentHeightPx: number, pageHeightPx: number): number {
  if (!Number.isFinite(contentHeightPx) || !Number.isFinite(pageHeightPx)) {
    return 0;
  }
  if (contentHeightPx <= 0 || pageHeightPx <= 0) {
    return 0;
  }
  return Math.ceil(contentHeightPx / pageHeightPx);
}

/** Exact start of every slice: page N starts at N × page height. */
export function getSliceOffsets(pageCount: number, pageHeightPx: number): number[] {
  if (pageCount <= 0 || !Number.isFinite(pageHeightPx) || pageHeightPx <= 0) {
    return [];
  }
  return Array.from({ length: pageCount }, (_, index) => index * pageHeightPx);
}

/**
 * Turn a measured content height into page-sized slices.
 *
 * Slices tile the document exactly: slice N starts where slice N-1 ends, and
 * the final slice is clipped to the content still remaining, so no content is
 * dropped or rendered twice at a page boundary.
 */
export function createPagePlan(
  contentHeightPx: number,
  orientation: HtmlToPdfOrientation = 'portrait',
): PagePlan {
  const pageSize = getPageDimensions(orientation);
  const pageCount = getPageCount(contentHeightPx, pageSize.heightPx);
  const slices = getSliceOffsets(pageCount, pageSize.heightPx).map((offsetYPx, index) => ({
    index,
    offsetYPx,
    heightPx: Math.min(pageSize.heightPx, contentHeightPx - offsetYPx),
  }));

  return {
    orientation,
    pageSize,
    sliceHeightPx: pageSize.heightPx,
    contentHeightPx,
    pageCount,
    slices,
  };
}

/**
 * Measured height of the rendered document. The bounding rect includes
 * borders and fractional layout height; scrollHeight covers overflow. Use the
 * taller value so the last page is not clipped by a pixel or two.
 */
export function measureContentHeightPx(element: HTMLElement): number {
  return Math.max(element.scrollHeight, element.getBoundingClientRect().height);
}

/**
 * Rasterise a rendered HTML element into an A4 PDF, one image per page.
 *
 * The whole element is captured once per page with the same fixed width; each
 * capture is translated up by an exact page height. The capture viewport then
 * shows exactly that page's band of the document, clipped to the remaining
 * content on the final page.
 */
export async function htmlToPdf(
  element: HTMLElement,
  options: HtmlToPdfOptions = {},
): Promise<HtmlToPdfResult> {
  const orientation = options.orientation ?? 'portrait';
  const plan = createPagePlan(measureContentHeightPx(element), orientation);

  if (plan.pageCount === 0) {
    throw new Error('There is no rendered HTML content to convert.');
  }

  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageWidthPt = pdf.internal.pageSize.getWidth();
  const pageHeightPt = pdf.internal.pageSize.getHeight();

  for (const slice of plan.slices) {
    if (slice.index > 0) {
      pdf.addPage('a4', orientation);
    }

    const imageDataUrl = await toJpeg(element, {
      width: plan.pageSize.widthPx,
      height: slice.heightPx,
      pixelRatio: HTML_TO_PDF_PIXEL_RATIO,
      quality: HTML_TO_PDF_JPEG_QUALITY,
      backgroundColor: HTML_TO_PDF_BACKGROUND_COLOR,
      style: { transform: `translateY(${-slice.offsetYPx}px)` },
    });

    const sliceHeightPt = pageHeightPt * (slice.heightPx / plan.sliceHeightPx);
    pdf.addImage(imageDataUrl, 'JPEG', 0, 0, pageWidthPt, sliceHeightPt);
  }

  return { blob: pdf.output('blob'), pageCount: plan.pageCount };
}
