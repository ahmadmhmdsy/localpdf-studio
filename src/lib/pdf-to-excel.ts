import { pdfjsLib } from './pdfjs';

export async function convertPdfToExcel(file: File): Promise<Blob> {
  const ExcelJS = await import('exceljs');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const rows: string[][] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const lineMap = new Map<number, Array<{ text: string; x: number }>>();

    for (const item of textContent.items as any[]) {
      const y = Math.round(item.transform[5] / 5) * 5;

      if (!lineMap.has(y)) {
        lineMap.set(y, []);
      }
      lineMap.get(y)!.push({
        text: item.str,
        x: item.transform[4],
      });
    }

    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);

    for (const y of sortedY) {
      const items = lineMap.get(y)!;
      items.sort((a, b) => a.x - b.x);

      const row: string[] = [];
      let currentCell = items[0]?.text || '';
      let lastX = items[0]?.x || 0;

      for (let j = 1; j < items.length; j++) {
        const item = items[j];
        const gap = item.x - lastX;

        if (gap > 30) {
          row.push(currentCell.trim());
          currentCell = item.text;
        } else {
          currentCell += ' ' + item.text;
        }
        lastX = item.x;
      }

      if (currentCell.trim()) {
        row.push(currentCell.trim());
      }

      if (row.length > 0) {
        rows.push(row);
      }
    }
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Extracted Data');

  if (rows.length > 0) {
    worksheet.addRows(rows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
