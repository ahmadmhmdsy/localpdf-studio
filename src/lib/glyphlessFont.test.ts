import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { GLYPHLESS_FONT_NAME, buildGlyphlessTrueType, embedGlyphlessFont, encodeGlyphless } from './glyphlessFont';

// ocr.ts loads pdf.js through a Vite `?url` worker import; the round trip below
// uses the legacy build directly instead.
vi.mock('./pdfjs', () => ({ pdfjsLib: {} }));
const { textLayerOperators } = await import('./ocr');

describe('encodeGlyphless', () => {
  it('encodes each character as its 2-byte code point', () => {
    const encoded = encodeGlyphless('Aب');
    expect(encoded.hex.asString()).toBe('00410628');
    expect(encoded).toMatchObject({ length: 2, dropped: 0 });
  });

  it('drops characters outside the BMP', () => {
    expect(encodeGlyphless('a😀b')).toMatchObject({ length: 2, dropped: 1 });
  });
});

describe('buildGlyphlessTrueType', () => {
  it('builds a font whose whole-file checksum is the TrueType magic number', () => {
    const font = buildGlyphlessTrueType();
    const view = new DataView(font.buffer);
    let sum = 0;
    for (let i = 0; i < font.length; i += 4) sum = (sum + view.getUint32(i)) >>> 0;
    expect(sum).toBe(0xb1b0afba);
  });
});

describe('OCR text layer round trip through pdf.js', () => {
  it('extracts English and Arabic words as written, aligned to their boxes', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([600, 200]);
    const key = page.node.newFontDictionary(GLYPHLESS_FONT_NAME, embedGlyphlessFont(pdf));
    const toPdf = (x: number, y: number): [number, number] => [x, 200 - y];
    const words = [
      { text: 'مرحبا', bbox: { x0: 400, y0: 50, x1: 500, y1: 80 } },
      { text: 'بالعالم', bbox: { x0: 270, y0: 50, x1: 390, y1: 80 } },
      { text: 'Hello', bbox: { x0: 20, y0: 120, x1: 100, y1: 150 } },
      { text: 'صفحة', bbox: { x0: 470, y0: 160, x1: 540, y1: 190 } },
      { text: '١٢٣', bbox: { x0: 420, y0: 160, x1: 460, y1: 190 } },
      { text: 'PDF،', bbox: { x0: 340, y0: 160, x1: 410, y1: 190 } },
    ];
    page.pushOperators(...textLayerOperators(words, key, toPdf).operators);

    const task = pdfjs.getDocument({ data: await pdf.save(), verbosity: 0 });
    const doc = await task.promise;
    const { items } = await (await doc.getPage(1)).getTextContent();
    const extracted = (items as { str: string; width: number; transform: number[] }[]).filter((i) => i.str);

    expect(extracted.map((i) => i.str)).toEqual(words.map((w) => w.text));
    extracted.forEach((item, i) => {
      const { x0, x1, y1 } = words[i].bbox;
      expect(item.width).toBeCloseTo(x1 - x0, 1);
      expect(item.transform[4]).toBeCloseTo(x0, 1);
      expect(item.transform[5]).toBeCloseTo(200 - y1, 1);
    });
    await task.destroy();
  });
});
