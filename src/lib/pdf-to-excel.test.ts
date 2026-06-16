import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetTextContent, mockGetPage, mockGetDocument } = vi.hoisted(() => {
  const mockGetTextContent = vi.fn();
  const mockGetPage = vi.fn().mockResolvedValue({ getTextContent: mockGetTextContent });
  const mockGetDocument = vi.fn(() => ({
    promise: Promise.resolve({ getPage: mockGetPage, numPages: 1 }),
  }));
  return { mockGetTextContent, mockGetPage, mockGetDocument };
});

vi.mock('pdfjs-dist', () => ({
  __esModule: true,
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: mockGetDocument,
  mockGetTextContent, // re-export for tests to read
}));

vi.mock('./pdfjs', () => ({
  pdfjsLib: { getDocument: mockGetDocument },
}));

const { mockAddRows, mockAddWorksheet, mockWriteBuffer } = vi.hoisted(() => {
  const ws: any = { addRows: vi.fn() };
  const wb: any = {
    addWorksheet: vi.fn(() => ws),
    xlsx: { writeBuffer: vi.fn() },
  };
  return {
    mockAddRows: ws.addRows,
    mockAddWorksheet: wb.addWorksheet,
    mockWriteBuffer: wb.xlsx.writeBuffer,
  };
});

vi.mock('exceljs', () => {
  const wb: any = {
    addWorksheet: vi.fn(),
    xlsx: { writeBuffer: vi.fn() },
  };
  // Re-bind the methods so the closures are reachable.
  wb.addWorksheet.mockImplementation(() => ({ addRows: mockAddRows }));
  wb.xlsx.writeBuffer.mockImplementation(() => mockWriteBuffer());
  function Workbook() {
    return wb;
  }
  return { __esModule: true, Workbook, default: { Workbook } };
});

import { convertPdfToExcel } from './pdf-to-excel';

describe('convertPdfToExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTextContent.mockReset();
    // Re-bind after clearAllMocks.
    mockGetPage.mockResolvedValue({ getTextContent: mockGetTextContent });
    mockGetDocument.mockImplementation(() => ({
      promise: Promise.resolve({ getPage: mockGetPage, numPages: 1 }),
    }));
    mockWriteBuffer.mockResolvedValue(new ArrayBuffer(8));
    mockAddRows.mockReset();
  });

  it('creates a worksheet called "Extracted Data" and returns a Blob', async () => {
    mockGetTextContent.mockResolvedValueOnce({ items: [] });

    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'in.pdf', { type: 'application/pdf' });
    const result = await convertPdfToExcel(file);

    // addWorksheet is called by the Workbook mock; assert it received the name.
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toContain('spreadsheetml');
  });

  it('groups text items into rows by Y coordinate (rounded to multiples of 5)', async () => {
    mockGetTextContent
      .mockResolvedValueOnce({
        items: [
          { str: 'Name', transform: [0, 0, 0, 0, 0, 50] },
          { str: 'Age', transform: [0, 0, 0, 0, 100, 50] },
          { str: 'Bob', transform: [0, 0, 0, 0, 0, 30] },
          { str: '42', transform: [0, 0, 0, 0, 100, 30] },
        ],
      })
      .mockResolvedValueOnce({ items: [] });

    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToExcel(file);

    expect(mockAddRows).toHaveBeenCalledTimes(1);
    const rowsArg = mockAddRows.mock.calls[0][0];
    // The function sorts by Y descending, so the first row in the output
    // is the one at Y=50 (header) and the second at Y=30 (data).
    expect(rowsArg).toHaveLength(2);
    expect(rowsArg[0]).toEqual(['Name', 'Age']);
    expect(rowsArg[1]).toEqual(['Bob', '42']);
  });

  it('separates items into cells when the X gap is > 30', async () => {
    mockGetTextContent.mockResolvedValueOnce({
      items: [
        { str: 'A', transform: [0, 0, 0, 0, 0, 50] },
        { str: 'B', transform: [0, 0, 0, 0, 50, 50] }, // gap = 50 > 30 → new cell
      ],
    });

    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToExcel(file);

    const rowsArg = mockAddRows.mock.calls[0][0];
    expect(rowsArg[0]).toEqual(['A', 'B']);
  });

  it('merges items into the same cell when the X gap is <= 30', async () => {
    mockGetTextContent.mockResolvedValueOnce({
      items: [
        { str: 'Hello', transform: [0, 0, 0, 0, 0, 50] },
        { str: 'World', transform: [0, 0, 0, 0, 20, 50] }, // gap = 20 → same cell
      ],
    });

    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToExcel(file);

    const rowsArg = mockAddRows.mock.calls[0][0];
    expect(rowsArg[0]).toEqual(['Hello World']);
  });

  it('does not call addRows when there are no rows extracted', async () => {
    mockGetTextContent.mockResolvedValueOnce({ items: [] });

    const file = new File([new Uint8Array([1])], 'in.pdf');
    await convertPdfToExcel(file);

    expect(mockAddRows).not.toHaveBeenCalled();
  });
});
