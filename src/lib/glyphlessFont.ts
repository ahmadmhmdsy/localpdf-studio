import { PDFDocument, PDFHexString, PDFRef, PDFString } from 'pdf-lib';

/**
 * An invisible-text font for OCR layers, after Tesseract's own "GlyphLessFont":
 * a Type0 font with Identity-H encoding where each 2-byte code is the
 * character's Unicode (BMP) code point. Every code maps to one empty glyph
 * with a fixed advance, and a ToUnicode CMap maps codes back to text, so any
 * script — including Arabic — can be searched and copied without embedding a
 * real font.
 */

export const GLYPHLESS_FONT_NAME = 'GlyphLessFont';
/** Advance width of every character, in 1/1000 em. */
export const GLYPHLESS_ADVANCE = 500;

const UNITS_PER_EM = 1000;

export interface EncodedText {
  hex: PDFHexString;
  /** Number of encoded characters (each advances by GLYPHLESS_ADVANCE). */
  length: number;
  /** Characters outside the BMP, which a 2-byte code cannot hold; they are left out. */
  dropped: number;
}

export function encodeGlyphless(text: string): EncodedText {
  let hex = '';
  let length = 0;
  let dropped = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code > 0xffff) {
      dropped++;
      continue;
    }
    hex += code.toString(16).padStart(4, '0').toUpperCase();
    length++;
  }
  return { hex: PDFHexString.of(hex), length, dropped };
}

/** Embeds the font once per document and returns its reference. */
export function embedGlyphlessFont(pdf: PDFDocument): PDFRef {
  const { context } = pdf;
  const fontFile = buildGlyphlessTrueType();

  // Every CID (0–0xFFFF) maps to glyph 1, the empty glyph.
  const cidToGid = new Uint8Array(0x10000 * 2);
  for (let i = 1; i < cidToGid.length; i += 2) cidToGid[i] = 1;

  const descriptor = context.register(
    context.obj({
      Type: 'FontDescriptor',
      FontName: GLYPHLESS_FONT_NAME,
      Flags: 5, // FixedPitch | Symbolic
      FontBBox: [0, 0, GLYPHLESS_ADVANCE, UNITS_PER_EM],
      ItalicAngle: 0,
      Ascent: UNITS_PER_EM,
      Descent: 0,
      CapHeight: UNITS_PER_EM,
      StemV: 80,
      FontFile2: context.register(context.flateStream(fontFile, { Length1: fontFile.length })),
    }),
  );
  const cidFont = context.register(
    context.obj({
      Type: 'Font',
      Subtype: 'CIDFontType2',
      BaseFont: GLYPHLESS_FONT_NAME,
      CIDSystemInfo: { Registry: PDFString.of('Adobe'), Ordering: PDFString.of('Identity'), Supplement: 0 },
      FontDescriptor: descriptor,
      DW: GLYPHLESS_ADVANCE,
      CIDToGIDMap: context.register(context.flateStream(cidToGid)),
    }),
  );
  return context.register(
    context.obj({
      Type: 'Font',
      Subtype: 'Type0',
      BaseFont: GLYPHLESS_FONT_NAME,
      Encoding: 'Identity-H',
      DescendantFonts: [cidFont],
      ToUnicode: context.register(context.flateStream(toUnicodeCMap())),
    }),
  );
}

/** Identity code → Unicode mapping for the BMP, skipping the surrogate range. */
export function toUnicodeCMap(): string {
  const ranges: string[] = [];
  for (let high = 0; high <= 0xff; high++) {
    if (high >= 0xd8 && high <= 0xdf) continue;
    const h = high.toString(16).padStart(2, '0').toUpperCase();
    ranges.push(`<${h}00> <${h}FF> <${h}00>`);
  }
  // A bfrange block may hold at most 100 entries.
  const blocks: string[] = [];
  for (let i = 0; i < ranges.length; i += 100) {
    const chunk = ranges.slice(i, i + 100);
    blocks.push(`${chunk.length} beginbfrange\n${chunk.join('\n')}\nendbfrange`);
  }
  return [
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin',
    'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /Adobe-Identity-UCS def',
    '/CMapType 2 def',
    '1 begincodespacerange',
    '<0000> <FFFF>',
    'endcodespacerange',
    ...blocks,
    'endcmap',
    'CMapName currentdict /CMap defineresource pop',
    'end',
    'end',
  ].join('\n');
}

/**
 * A minimal TrueType font with two empty glyphs (.notdef and a blank), both
 * GLYPHLESS_ADVANCE wide. Built in code so no font file has to be shipped.
 */
export function buildGlyphlessTrueType(): Uint8Array {
  const tables: [string, Uint8Array][] = [
    ['cmap', bytes((w) => {
      // Format 4 with only the required 0xFFFF end segment.
      w.u16(0).u16(1).u16(3).u16(1).u32(12);
      w.u16(4).u16(24).u16(0).u16(2).u16(2).u16(0).u16(0);
      w.u16(0xffff).u16(0).u16(0xffff).u16(1).u16(0);
    })],
    ['glyf', new Uint8Array(0)],
    ['head', bytes((w) => {
      w.u32(0x00010000).u32(0x00010000).u32(0).u32(0x5f0f3cf5);
      w.u16(0x000b).u16(UNITS_PER_EM).u32(0).u32(0).u32(0).u32(0);
      w.u16(0).u16(0).u16(GLYPHLESS_ADVANCE).u16(UNITS_PER_EM);
      w.u16(0).u16(8).u16(2).u16(0).u16(0); // macStyle, lowestRecPPEM, direction hint, short loca, glyph format
    })],
    ['hhea', bytes((w) => {
      w.u32(0x00010000).u16(UNITS_PER_EM).u16(0).u16(0).u16(GLYPHLESS_ADVANCE);
      w.u16(0).u16(0).u16(0).u16(1).u16(0).u16(0);
      w.u16(0).u16(0).u16(0).u16(0).u16(0).u16(2);
    })],
    ['hmtx', bytes((w) => w.u16(GLYPHLESS_ADVANCE).u16(0).u16(GLYPHLESS_ADVANCE).u16(0))],
    ['loca', bytes((w) => w.u16(0).u16(0).u16(0))],
    ['maxp', bytes((w) => {
      w.u32(0x00010000).u16(2);
      for (let i = 0; i < 13; i++) w.u16(i === 5 ? 2 : 0); // maxZones = 2
    })],
    ['name', bytes((w) => w.u16(0).u16(0).u16(6))],
    ['post', bytes((w) => w.u32(0x00030000).u32(0).u16(0).u16(0).u32(0).u32(0).u32(0).u32(0).u32(0))],
  ];

  const numTables = tables.length;
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = 2 ** entrySelector * 16;
  const headerSize = 12 + numTables * 16;
  const padded = (n: number) => (n + 3) & ~3;
  const total = tables.reduce((sum, [, data]) => sum + padded(data.length), headerSize);

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x00010000);
  view.setUint16(4, numTables);
  view.setUint16(6, searchRange);
  view.setUint16(8, entrySelector);
  view.setUint16(10, numTables * 16 - searchRange);

  let offset = headerSize;
  let headOffset = 0;
  tables.forEach(([tag, data], i) => {
    const record = 12 + i * 16;
    for (let c = 0; c < 4; c++) view.setUint8(record + c, tag.charCodeAt(c));
    view.setUint32(record + 4, checksum(data));
    view.setUint32(record + 8, offset);
    view.setUint32(record + 12, data.length);
    out.set(data, offset);
    if (tag === 'head') headOffset = offset;
    offset += padded(data.length);
  });
  view.setUint32(headOffset + 8, (0xb1b0afba - checksum(out)) >>> 0);
  return out;
}

function checksum(data: Uint8Array): number {
  const padded = new Uint8Array((data.length + 3) & ~3);
  padded.set(data);
  const view = new DataView(padded.buffer);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + view.getUint32(i)) >>> 0;
  return sum;
}

interface Writer {
  u16(value: number): Writer;
  u32(value: number): Writer;
}

function bytes(write: (w: Writer) => void): Uint8Array {
  const values: number[] = [];
  const w: Writer = {
    u16(value) {
      values.push((value >> 8) & 0xff, value & 0xff);
      return w;
    },
    u32(value) {
      values.push((value >>> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
      return w;
    },
  };
  write(w);
  return Uint8Array.from(values);
}
