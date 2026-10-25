import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPagePlan,
  getPageCount,
  getPageDimensions,
  getSliceOffsets,
  htmlToPdf,
  measureContentHeightPx,
} from './htmlToPdf';
import {
  A4_HEIGHT_CSS_PX,
  A4_WIDTH_CSS_PX,
  HTML_TO_PDF_JPEG_QUALITY,
  HTML_TO_PDF_PIXEL_RATIO,
} from '../constants/htmlToPdf';

interface MockPdfInstance {
  options: { orientation?: string };
  addPage: ReturnType<typeof vi.fn>;
  addImage: ReturnType<typeof vi.fn>;
  output: ReturnType<typeof vi.fn>;
}

const { toJpegMock, pdfInstances } = vi.hoisted(() => ({
  toJpegMock: vi.fn(async (_node: HTMLElement, _options: unknown) => 'data:image/jpeg;base64,AAAA'),
  pdfInstances: [] as unknown[],
}));

vi.mock('html-to-image', () => ({ toJpeg: toJpegMock }));

vi.mock('jspdf', () => {
  class MockJsPDF {
    options: { orientation?: string };
    addPage = vi.fn();
    addImage = vi.fn();
    output = vi.fn(() => new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };

    constructor(options: { orientation?: string } = {}) {
      this.options = options;
      const landscape = options.orientation === 'landscape';
      const pageSize = {
        width: landscape ? 841.89 : 595.28,
        height: landscape ? 595.28 : 841.89,
      };
      this.internal = {
        pageSize: {
          getWidth: () => pageSize.width,
          getHeight: () => pageSize.height,
        },
      };
      pdfInstances.push(this);
    }
  }

  return { jsPDF: MockJsPDF };
});

function elementWithHeight(scrollHeight: number, rectHeight = 0): HTMLElement {
  const element = document.createElement('div');
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight });
  element.getBoundingClientRect = () => ({ height: rectHeight } as DOMRect);
  return element;
}

function lastPdf(): MockPdfInstance {
  return pdfInstances[pdfInstances.length - 1] as MockPdfInstance;
}

describe('getPageDimensions', () => {
  it('returns A4 portrait dimensions from the shared constants', () => {
    expect(getPageDimensions('portrait')).toEqual({
      widthPx: A4_WIDTH_CSS_PX,
      heightPx: A4_HEIGHT_CSS_PX,
    });
  });

  it('swaps width and height for landscape', () => {
    expect(getPageDimensions('landscape')).toEqual({
      widthPx: A4_HEIGHT_CSS_PX,
      heightPx: A4_WIDTH_CSS_PX,
    });
  });

  it('uses A4 at the 96 dpi CSS reference resolution', () => {
    expect(A4_WIDTH_CSS_PX).toBeCloseTo(793.7, 1);
    expect(A4_HEIGHT_CSS_PX).toBeCloseTo(1122.52, 1);
    expect(A4_WIDTH_CSS_PX / A4_HEIGHT_CSS_PX).toBeCloseTo(210 / 297, 6);
  });
});

describe('getPageCount', () => {
  it('returns 0 when there is no content', () => {
    expect(getPageCount(0, A4_HEIGHT_CSS_PX)).toBe(0);
    expect(getPageCount(-10, A4_HEIGHT_CSS_PX)).toBe(0);
    expect(getPageCount(Number.NaN, A4_HEIGHT_CSS_PX)).toBe(0);
    expect(getPageCount(100, 0)).toBe(0);
  });

  it('returns 1 page when the content fits', () => {
    expect(getPageCount(1, A4_HEIGHT_CSS_PX)).toBe(1);
    expect(getPageCount(A4_HEIGHT_CSS_PX, A4_HEIGHT_CSS_PX)).toBe(1);
  });

  it('rounds a partial page up', () => {
    expect(getPageCount(A4_HEIGHT_CSS_PX + 1, A4_HEIGHT_CSS_PX)).toBe(2);
    expect(getPageCount(A4_HEIGHT_CSS_PX * 2.5, A4_HEIGHT_CSS_PX)).toBe(3);
  });
});

describe('getSliceOffsets', () => {
  it('starts every slice an exact page height below the previous one', () => {
    expect(getSliceOffsets(3, 100)).toEqual([0, 100, 200]);
  });

  it('returns no offsets without pages', () => {
    expect(getSliceOffsets(0, 100)).toEqual([]);
    expect(getSliceOffsets(-1, 100)).toEqual([]);
    expect(getSliceOffsets(2, 0)).toEqual([]);
  });
});

describe('createPagePlan', () => {
  it('tiles the document with no gap and no overlap', () => {
    const contentHeightPx = A4_HEIGHT_CSS_PX * 2.5;
    const plan = createPagePlan(contentHeightPx);

    expect(plan.orientation).toBe('portrait');
    expect(plan.pageCount).toBe(3);
    expect(plan.sliceHeightPx).toBe(A4_HEIGHT_CSS_PX);
    expect(plan.slices).toHaveLength(3);

    plan.slices.forEach((slice, index) => {
      expect(slice.index).toBe(index);
      expect(slice.offsetYPx).toBeCloseTo(index * A4_HEIGHT_CSS_PX, 6);
      if (index > 0) {
        const previous = plan.slices[index - 1];
        expect(slice.offsetYPx).toBeCloseTo(previous.offsetYPx + previous.heightPx, 6);
      }
    });

    expect(plan.slices[0].heightPx).toBeCloseTo(A4_HEIGHT_CSS_PX, 6);
    expect(plan.slices[1].heightPx).toBeCloseTo(A4_HEIGHT_CSS_PX, 6);
    expect(plan.slices[2].heightPx).toBeCloseTo(A4_HEIGHT_CSS_PX * 0.5, 6);

    const coveredHeightPx = plan.slices.reduce((total, slice) => total + slice.heightPx, 0);
    expect(coveredHeightPx).toBeCloseTo(contentHeightPx, 6);
  });

  it('changes the page count and slice width with the orientation', () => {
    const contentHeightPx = A4_HEIGHT_CSS_PX * 0.9;

    const portrait = createPagePlan(contentHeightPx, 'portrait');
    expect(portrait.pageCount).toBe(1);
    expect(portrait.pageSize).toEqual({ widthPx: A4_WIDTH_CSS_PX, heightPx: A4_HEIGHT_CSS_PX });

    const landscape = createPagePlan(contentHeightPx, 'landscape');
    expect(landscape.pageCount).toBe(2);
    expect(landscape.pageSize).toEqual({ widthPx: A4_HEIGHT_CSS_PX, heightPx: A4_WIDTH_CSS_PX });
    expect(landscape.sliceHeightPx).toBe(A4_WIDTH_CSS_PX);
  });

  it('produces an empty plan for empty content', () => {
    const plan = createPagePlan(0);
    expect(plan.pageCount).toBe(0);
    expect(plan.slices).toEqual([]);
  });
});

describe('measureContentHeightPx', () => {
  it('uses scrollHeight when the bounding rect is smaller', () => {
    expect(measureContentHeightPx(elementWithHeight(2400, 0))).toBe(2400);
  });

  it('uses the bounding rect when it is taller than scrollHeight', () => {
    expect(measureContentHeightPx(elementWithHeight(1000, 1200))).toBe(1200);
  });
});

describe('htmlToPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pdfInstances.length = 0;
    toJpegMock.mockResolvedValue('data:image/jpeg;base64,AAAA');
  });

  it('captures one slice per page and assembles a portrait A4 PDF', async () => {
    const element = elementWithHeight(A4_HEIGHT_CSS_PX * 2.5);

    const result = await htmlToPdf(element);

    expect(result.pageCount).toBe(3);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(pdfInstances).toHaveLength(1);

    const pdf = lastPdf();
    expect(pdf.options).toMatchObject({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    expect(toJpegMock).toHaveBeenCalledTimes(3);
    expect(toJpegMock.mock.calls[0][1]).toMatchObject({
      width: A4_WIDTH_CSS_PX,
      height: A4_HEIGHT_CSS_PX,
      pixelRatio: HTML_TO_PDF_PIXEL_RATIO,
      quality: HTML_TO_PDF_JPEG_QUALITY,
      backgroundColor: '#ffffff',
      style: { transform: 'translateY(0px)' },
    });
    expect(toJpegMock.mock.calls[1][1]).toMatchObject({
      height: A4_HEIGHT_CSS_PX,
      style: { transform: `translateY(${-A4_HEIGHT_CSS_PX}px)` },
    });
    const lastCaptureOptions = toJpegMock.mock.calls[2][1] as {
      height: number;
      style: { transform: string };
    };
    expect(lastCaptureOptions.height).toBeCloseTo(A4_HEIGHT_CSS_PX * 0.5, 6);
    expect(lastCaptureOptions.style.transform).toBe(
      `translateY(${-A4_HEIGHT_CSS_PX * 2}px)`,
    );

    expect(pdf.addPage).toHaveBeenCalledTimes(2);
    expect(pdf.addPage).toHaveBeenNthCalledWith(1, 'a4', 'portrait');

    expect(pdf.addImage).toHaveBeenCalledTimes(3);
    const firstDraw = pdf.addImage.mock.calls[0];
    expect(firstDraw[0]).toBe('data:image/jpeg;base64,AAAA');
    expect(firstDraw[1]).toBe('JPEG');
    expect(firstDraw[2]).toBe(0);
    expect(firstDraw[3]).toBe(0);
    expect(firstDraw[4]).toBeCloseTo(595.28, 2);
    expect(firstDraw[5]).toBeCloseTo(841.89, 2);

    const lastDraw = pdf.addImage.mock.calls[2];
    expect(lastDraw[5]).toBeCloseTo(841.89 * 0.5, 2);
    expect(pdf.output).toHaveBeenCalledWith('blob');
  });

  it('swaps the captured slice and the PDF page for landscape', async () => {
    const element = elementWithHeight(A4_HEIGHT_CSS_PX * 0.75);

    const result = await htmlToPdf(element, { orientation: 'landscape' });

    expect(result.pageCount).toBe(2);
    const pdf = lastPdf();
    expect(pdf.options.orientation).toBe('landscape');

    expect(toJpegMock.mock.calls[0][1]).toMatchObject({
      width: A4_HEIGHT_CSS_PX,
      height: A4_WIDTH_CSS_PX,
    });
    const lastLandscapeCapture = toJpegMock.mock.calls[1][1] as { width: number; height: number };
    expect(lastLandscapeCapture.width).toBe(A4_HEIGHT_CSS_PX);
    expect(lastLandscapeCapture.height).toBeCloseTo(
      A4_HEIGHT_CSS_PX * 0.75 - A4_WIDTH_CSS_PX,
      6,
    );
    expect(pdf.addPage).toHaveBeenCalledWith('a4', 'landscape');

    const firstDraw = pdf.addImage.mock.calls[0];
    expect(firstDraw[4]).toBeCloseTo(841.89, 2);
    expect(firstDraw[5]).toBeCloseTo(595.28, 2);
  });

  it('fails clearly instead of emitting a blank page for empty content', async () => {
    const element = elementWithHeight(0, 0);

    await expect(htmlToPdf(element)).rejects.toThrow(/no rendered html content/i);
    expect(toJpegMock).not.toHaveBeenCalled();
    expect(pdfInstances).toHaveLength(0);
  });
});
