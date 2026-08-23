import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function convertExcelToPdf(file: File): Promise<Uint8Array> {
  const ExcelJS = await import('exceljs');
  const arrayBuffer = await file.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const MARGIN = 36;
  const CELL_HEIGHT = 18;
  const MAX_COL_WIDTH = 150;
  const MIN_COL_WIDTH = 50;

  const sheetNames: string[] = [];
  workbook.eachSheet((ws) => { sheetNames.push(ws.name); });

  for (const sheetName of sheetNames) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) continue;

    const data: unknown[][] = [];
    let maxColCount = 0;

    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const rowData: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        rowData.push(cell.value);
      });
      maxColCount = Math.max(maxColCount, rowData.length);
      data.push(rowData);
    });

    // Normalize row lengths
    for (const row of data) {
      while (row.length < maxColCount) {
        row.push(null);
      }
    }

    if (data.length === 0) continue;

    const colCount = Math.max(...data.map(row => row.length));
    const colWidths: number[] = [];

    for (let col = 0; col < colCount; col++) {
      let maxWidth = MIN_COL_WIDTH;
      for (const row of data) {
        const cellValue = String(row[col] ?? '');
        const textWidth = cellValue.length * 6;
        maxWidth = Math.min(MAX_COL_WIDTH, Math.max(maxWidth, textWidth + 16));
      }
      colWidths.push(maxWidth);
    }

    let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN - 30;

    page.drawText(`Sheet: ${sheetName}`, {
      x: MARGIN,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    let isHeader = true;
    for (const row of data) {
      if (y < MARGIN + CELL_HEIGHT) {
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
        isHeader = true;
      }

      let x = MARGIN;
      let maxRowHeight = CELL_HEIGHT;

      for (let col = 0; col < colCount; col++) {
        const cellValue = String(row[col] ?? '');
        const colWidth = colWidths[col] ?? MIN_COL_WIDTH;
        const lines = Math.ceil((cellValue.length * 6) / (colWidth - 8));
        const neededHeight = Math.max(CELL_HEIGHT, lines * 14 + 4);
        maxRowHeight = Math.max(maxRowHeight, neededHeight);
      }

      for (let col = 0; col < colCount; col++) {
        const cellValue = String(row[col] ?? '');
        const colWidth = colWidths[col] ?? MIN_COL_WIDTH;

        if (isHeader) {
          page.drawRectangle({
            x,
            y: y - maxRowHeight + 2,
            width: colWidth,
            height: maxRowHeight - 2,
            color: rgb(0.9, 0.9, 0.9),
          });
        }

        page.drawRectangle({
          x,
          y: y - maxRowHeight + 2,
          width: colWidth,
          height: maxRowHeight - 2,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5,
        });

        if (cellValue) {
          const useFont = isHeader ? boldFont : font;
          const text = cellValue.substring(0, Math.floor((colWidth - 8) / 6));
          page.drawText(text, {
            x: x + 4,
            y: y - maxRowHeight / 2 - 3,
            size: 9,
            font: useFont,
            color: rgb(0, 0, 0),
          });
        }

        x += colWidth;
      }

      y -= maxRowHeight;
      isHeader = false;
    }

    const idx = sheetNames.indexOf(sheetName);
    if (idx < sheetNames.length - 1 && y < MARGIN + 50) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    }
  }

  return await pdf.save();
}