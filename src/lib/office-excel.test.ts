import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build a fake exceljs Workbook with chainable APIs.
function makeWorkbook(sheets: Array<{ name: string; rows: Array<Array<{ value: unknown }>> }>) {
  const sheetMap = new Map(sheets.map((s) => [s.name, s]));

  const eachRowMock = vi.fn((opts: any, cb: (row: any) => void) => {
    for (const sheet of sheets) {
      for (const row of sheet.rows) {
        cb({
          eachCell: (_o: any, cellCb: (cell: any) => void) => {
            for (const c of row) cellCb({ value: c.value });
          },
        });
      }
    }
  });

  const workbook: any = {
    xlsx: { load: vi.fn().mockResolvedValue(undefined) },
    eachSheet: vi.fn((cb: (ws: any) => void) => {
      for (const sheet of sheets) cb({ name: sheet.name });
    }),
    getWorksheet: vi.fn((name: string) => {
      const sheet = sheetMap.get(name);
      if (!sheet) return undefined;
      return { eachRow: eachRowMock };
    }),
  };
  return workbook;
}

const { mockWorkbookCtor, mockWorkbookInstance } = vi.hoisted(() => {
  const instance: any = { placeholder: true };
  return { mockWorkbookCtor: vi.fn(), mockWorkbookInstance: instance };
});

vi.mock('exceljs', () => {
  // The lib uses `new ExcelJS.Workbook()` and a chain of methods on the
  // instance. We provide a constructor that returns the hoisted instance.
  function Workbook() {
    return mockWorkbookInstance;
  }
  return { __esModule: true, Workbook, default: { Workbook } };
});

const { mockDrawText, mockDrawRectangle, mockAddPage, mockEmbedFont, mockSave, mockCreate } =
  vi.hoisted(() => {
    const page: any = {
      drawText: vi.fn(),
      drawRectangle: vi.fn(),
    };
    return {
      mockDrawText: page.drawText,
      mockDrawRectangle: page.drawRectangle,
      mockAddPage: vi.fn(() => page),
      mockEmbedFont: vi.fn(async () => ({})),
      mockSave: vi.fn(async () => new Uint8Array([1, 2, 3])),
      mockCreate: vi.fn(async () => ({
        addPage: mockAddPage,
        embedFont: mockEmbedFont,
        save: mockSave,
      })),
    };
  });

vi.mock('pdf-lib', () => ({
  PDFDocument: { create: mockCreate },
  rgb: vi.fn((r: number, g: number, b: number) => ({ type: 'RGB', red: r, green: g, blue: b })),
  StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'HelveticaBold' },
}));

import { convertExcelToPdf } from './office-excel';

describe('convertExcelToPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddPage.mockImplementation(() => ({
      drawText: mockDrawText,
      drawRectangle: mockDrawRectangle,
    }));
  });

  it('loads the XLSX array buffer into the ExcelJS workbook', async () => {
    const wb = makeWorkbook([{ name: 'Sheet1', rows: [] }]);
    mockWorkbookInstance.xlsx = wb.xlsx;
    mockWorkbookInstance.eachSheet = wb.eachSheet;
    mockWorkbookInstance.getWorksheet = wb.getWorksheet;
    const file = new File([new Uint8Array([1, 2, 3])], 'sheet.xlsx');

    await convertExcelToPdf(file);

    expect(wb.xlsx.load).toHaveBeenCalledWith(expect.any(ArrayBuffer));
  });

  it('skips sheets whose getWorksheet() returns undefined', async () => {
    const wb = makeWorkbook([{ name: 'Sheet1', rows: [] }]);
    mockWorkbookInstance.xlsx = wb.xlsx;
    mockWorkbookInstance.eachSheet = wb.eachSheet;
    mockWorkbookInstance.getWorksheet = vi.fn(() => undefined);
    const file = new File([new Uint8Array([1])], 'sheet.xlsx');

    await convertExcelToPdf(file);

    // No pages added because the only sheet returned undefined.
    expect(mockAddPage).not.toHaveBeenCalled();
  });

  it('draws a header label and at least one cell rectangle per row', async () => {
    const wb = makeWorkbook([
      { name: 'Data', rows: [[{ value: 'A' }, { value: 'B' }], [{ value: 1 }, { value: 2 }]] },
    ]);
    mockWorkbookInstance.xlsx = wb.xlsx;
    mockWorkbookInstance.eachSheet = wb.eachSheet;
    mockWorkbookInstance.getWorksheet = wb.getWorksheet;
    const file = new File([new Uint8Array([1])], 'sheet.xlsx');

    await convertExcelToPdf(file);

    // One sheet title, then a row of two cells, then another row of two
    // cells. The header row gets a fill rectangle + a border rectangle
    // per cell, data rows only get a border rectangle per cell.
    expect(mockDrawText).toHaveBeenCalledWith('Sheet: Data', expect.any(Object));
    expect(mockDrawRectangle).toHaveBeenCalled();
  });

  it('truncates long cell values to fit within the column width', async () => {
    const longValue = 'A'.repeat(500);
    const wb = makeWorkbook([
      { name: 'S', rows: [[{ value: longValue }]] },
    ]);
    mockWorkbookInstance.xlsx = wb.xlsx;
    mockWorkbookInstance.eachSheet = wb.eachSheet;
    mockWorkbookInstance.getWorksheet = wb.getWorksheet;
    const file = new File([new Uint8Array([1])], 's.xlsx');

    await convertExcelToPdf(file);

    const textArg = mockDrawText.mock.calls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].startsWith('A'))?.[0];
    expect(typeof textArg).toBe('string');
    expect((textArg as string).length).toBeLessThan(500);
  });

  it('returns the saved PDF as a Uint8Array', async () => {
    const wb = makeWorkbook([{ name: 'S', rows: [[{ value: 'x' }]] }]);
    mockWorkbookInstance.xlsx = wb.xlsx;
    mockWorkbookInstance.eachSheet = wb.eachSheet;
    mockWorkbookInstance.getWorksheet = wb.getWorksheet;
    const file = new File([new Uint8Array([1])], 's.xlsx');

    const result = await convertExcelToPdf(file);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(mockSave).toHaveBeenCalled();
  });
});
