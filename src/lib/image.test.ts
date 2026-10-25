import { describe, it, expect } from 'vitest';
import { deflateSync } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import { convertImagesToPdf, computeImagePlacement, jpgsToPdf, resolveImageDpi } from './image';

// Smallest known-good 1x1 JPEG (125 bytes). Tests patch the JFIF APP0 density
// and the SOF0 frame dimensions, which is all our parser and pdf-lib's embedder
// read from the header; the compressed scan data is never decoded here.
const BASE_JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
  0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
  0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
  0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
  0x82, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb,
  0xd1, 0xff, 0xd9,
]);

interface JpegOptions {
  width?: number;
  height?: number;
  dpiX?: number;
  dpiY?: number;
  /** JFIF density units: 0 = aspect ratio only, 1 = DPI, 2 = dots/cm. */
  units?: number;
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

/** Offset of the first occurrence of each JPEG marker segment (0xFF <marker>). */
function jpegSegmentOffsets(bytes: Uint8Array): Map<number, number> {
  const offsets = new Map<number, number>();
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const segmentLength = readUint16(bytes, offset + 2);
    if (segmentLength < 2) break;
    if (!offsets.has(marker)) offsets.set(marker, offset);
    offset += 2 + segmentLength;
  }
  return offsets;
}

function makeJpeg(options: JpegOptions = {}): Uint8Array {
  const { width = 1, height = 1, dpiX = 72, dpiY = 72, units = 1 } = options;
  const bytes = BASE_JPEG.slice();
  const segments = jpegSegmentOffsets(bytes);

  const app0 = segments.get(0xe0);
  if (app0 === undefined) throw new Error('fixture JPEG has no APP0 segment');
  bytes[app0 + 11] = units;
  bytes[app0 + 12] = (dpiX >> 8) & 0xff;
  bytes[app0 + 13] = dpiX & 0xff;
  bytes[app0 + 14] = (dpiY >> 8) & 0xff;
  bytes[app0 + 15] = dpiY & 0xff;

  const sof0 = segments.get(0xc0);
  if (sof0 === undefined) throw new Error('fixture JPEG has no SOF0 segment');
  bytes[sof0 + 5] = (height >> 8) & 0xff;
  bytes[sof0 + 6] = height & 0xff;
  bytes[sof0 + 7] = (width >> 8) & 0xff;
  bytes[sof0 + 8] = width & 0xff;

  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  const typeBytes = new TextEncoder().encode(type);
  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(concatBytes([typeBytes, data])));
  return chunk;
}

interface PngOptions {
  width?: number;
  height?: number;
  pixelsPerMetre?: number;
  /** pHYs unit byte: 1 = metre, 0 = unknown. */
  unit?: number;
  withDensity?: boolean;
}

/** Build a minimal valid truecolour PNG (8-bit RGB) so pdf-lib can decode it. */
function makePng(options: PngOptions = {}): Uint8Array {
  const { width = 12, height = 8, pixelsPerMetre = 11811, unit = 1, withDensity = true } = options;
  const signature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB

  const phys = new Uint8Array(9);
  const physView = new DataView(phys.buffer);
  physView.setUint32(0, pixelsPerMetre);
  physView.setUint32(4, pixelsPerMetre);
  phys[8] = unit;

  // Each scanline: filter byte 0 followed by RGB pixels.
  const raw = new Uint8Array((1 + width * 3) * height);
  const idat = new Uint8Array(deflateSync(raw));

  const parts = [signature, pngChunk('IHDR', ihdr)];
  if (withDensity) parts.push(pngChunk('pHYs', phys));
  parts.push(pngChunk('IDAT', idat), pngChunk('IEND', new Uint8Array(0)));
  return concatBytes(parts);
}

function fileFrom(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes], name, { type });
}

async function pageSizes(bytes: Uint8Array): Promise<{ width: number; height: number }[]> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPages().map((page) => page.getSize());
}

function gifBytes(): Uint8Array {
  return new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x02, 0x03]);
}

describe('jpgsToPdf (backward-compatible wrapper)', () => {
  it('produces a valid PDF', async () => {
    const bytes = await jpgsToPdf([fileFrom(makeJpeg({ width: 100, height: 50 }), 'test.jpg', 'image/jpeg')]);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('adds one page per input image', async () => {
    const bytes = await jpgsToPdf([
      fileFrom(makeJpeg(), 'a.jpg', 'image/jpeg'),
      fileFrom(makeJpeg(), 'b.jpg', 'image/jpeg'),
    ]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
  });

  it('returns a valid PDF for an empty input array', async () => {
    const bytes = await jpgsToPdf([]);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('throws a clear error that names files it could not convert', async () => {
    const gif = fileFrom(gifBytes(), 'anim.gif', 'image/gif');
    await expect(jpgsToPdf([fileFrom(makeJpeg(), 'ok.jpg', 'image/jpeg'), gif])).rejects.toThrow(/anim\.gif/);
  });
});

describe('convertImagesToPdf', () => {
  it('converts a JPEG whose MIME type is empty (desktop file picker case)', async () => {
    const noMime = fileFrom(makeJpeg({ width: 100, height: 50, dpiX: 96, dpiY: 96 }), 'from-desktop.jpg', '');
    const { bytes, skipped } = await convertImagesToPdf([noMime]);
    expect(skipped).toEqual([]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });

  it('embeds a PNG and sizes the page from its pHYs density', async () => {
    const png = fileFrom(makePng(), 'photo.png', 'image/png');
    const { bytes, skipped } = await convertImagesToPdf([png]);
    expect(skipped).toEqual([]);
    const sizes = await pageSizes(bytes);
    expect(sizes).toHaveLength(1);
    expect(sizes[0].width).toBeCloseTo(2.88, 2);
    expect(sizes[0].height).toBeCloseTo(1.92, 2);
  });

  it('reports unsupported files instead of silently dropping them', async () => {
    const jpg = fileFrom(makeJpeg(), 'ok.jpg', 'image/jpeg');
    const gif = fileFrom(gifBytes(), 'anim.gif', 'image/gif');
    const { bytes, skipped } = await convertImagesToPdf([jpg, gif]);
    expect(skipped).toEqual(['anim.gif']);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });

  it('reports bytes that pass the magic-byte check but cannot be decoded', async () => {
    const truncated = fileFrom(new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01]), 'truncated.jpg', 'image/jpeg');
    const good = fileFrom(makeJpeg(), 'ok.jpg', 'image/jpeg');
    const { bytes, skipped } = await convertImagesToPdf([good, truncated]);
    expect(skipped).toEqual(['truncated.jpg']);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });

  it('throws instead of returning a placeholder PDF when nothing can be converted', async () => {
    const gif = fileFrom(gifBytes(), 'anim.gif', 'image/gif');
    await expect(convertImagesToPdf([gif])).rejects.toThrow(/anim\.gif/);
  });

  it('places a 300 DPI photo on a sane A4 page', async () => {
    const photo = fileFrom(makeJpeg({ width: 3000, height: 2000, dpiX: 300, dpiY: 300 }), 'photo.jpg', 'image/jpeg');
    const { bytes, skipped } = await convertImagesToPdf([photo], { pageSize: 'a4' });
    expect(skipped).toEqual([]);
    const sizes = await pageSizes(bytes);
    expect(sizes).toHaveLength(1);
    expect(sizes[0].width).toBeCloseTo(595.28, 1);
    expect(sizes[0].height).toBeCloseTo(841.89, 1);
  });

  it('sizes the default image page from the stored 300 DPI', async () => {
    const photo = fileFrom(makeJpeg({ width: 3000, height: 2000, dpiX: 300, dpiY: 300 }), 'photo.jpg', 'image/jpeg');
    const { bytes } = await convertImagesToPdf([photo]);
    const sizes = await pageSizes(bytes);
    expect(sizes[0].width).toBeCloseTo(720, 1);
    expect(sizes[0].height).toBeCloseTo(480, 1);
  });

  it('maps a 72 DPI image to points one-to-one', async () => {
    const jpg = fileFrom(makeJpeg({ width: 720, height: 480, dpiX: 72, dpiY: 72 }), '72dpi.jpg', 'image/jpeg');
    const { bytes } = await convertImagesToPdf([jpg]);
    const sizes = await pageSizes(bytes);
    expect(sizes[0].width).toBeCloseTo(720, 1);
    expect(sizes[0].height).toBeCloseTo(480, 1);
  });

  it('converts a 96 DPI image at 0.75 points per pixel', async () => {
    const jpg = fileFrom(makeJpeg({ width: 960, height: 540, dpiX: 96, dpiY: 96 }), '96dpi.jpg', 'image/jpeg');
    const { bytes } = await convertImagesToPdf([jpg]);
    const sizes = await pageSizes(bytes);
    expect(sizes[0].width).toBeCloseTo(720, 1);
    expect(sizes[0].height).toBeCloseTo(405, 1);
  });
});

describe('resolveImageDpi', () => {
  it('reads JFIF density expressed in dots per inch', () => {
    expect(resolveImageDpi(makeJpeg({ dpiX: 300, dpiY: 300 }))).toEqual({ xDpi: 300, yDpi: 300 });
  });

  it('reads JFIF density expressed in dots per centimetre', () => {
    const dpi = resolveImageDpi(makeJpeg({ dpiX: 118, dpiY: 118, units: 2 }));
    expect(dpi.xDpi).toBeCloseTo(299.72, 2);
    expect(dpi.yDpi).toBeCloseTo(299.72, 2);
  });

  it('reads PNG pHYs density expressed in pixels per metre', () => {
    const dpi = resolveImageDpi(makePng({ pixelsPerMetre: 11811 }));
    expect(dpi.xDpi).toBeCloseTo(300, 1);
    expect(dpi.yDpi).toBeCloseTo(300, 1);
  });

  it('falls back to the default DPI when the JPEG declares no absolute density', () => {
    // JFIF units 0 means the density is an aspect ratio only.
    expect(resolveImageDpi(makeJpeg({ units: 0 }))).toEqual({ xDpi: 72, yDpi: 72 });
  });

  it('falls back to the default DPI when a PNG has no pHYs chunk', () => {
    expect(resolveImageDpi(makePng({ withDensity: false }))).toEqual({ xDpi: 72, yDpi: 72 });
  });

  it('clamps implausible densities to sane bounds', () => {
    expect(resolveImageDpi(makeJpeg({ dpiX: 1, dpiY: 1 }))).toEqual({ xDpi: 36, yDpi: 36 });
    expect(resolveImageDpi(makeJpeg({ dpiX: 5000, dpiY: 5000 }))).toEqual({ xDpi: 1200, yDpi: 1200 });
  });
});

describe('computeImagePlacement', () => {
  it('uses the image box for image-sized pages (default)', () => {
    expect(computeImagePlacement(720, 480, { xDpi: 72, yDpi: 72 })).toEqual({
      pageWidth: 720,
      pageHeight: 480,
      x: 0,
      y: 0,
      width: 720,
      height: 480,
    });
  });

  it('stretches the image across a fixed page when filling', () => {
    expect(
      computeImagePlacement(1200, 800, { xDpi: 300, yDpi: 300 }, { pageSize: 'letter', fit: 'fill' })
    ).toEqual({
      pageWidth: 612,
      pageHeight: 792,
      x: 0,
      y: 0,
      width: 612,
      height: 792,
    });
  });

  it('centres a contained landscape image with equal margins on A4', () => {
    const placement = computeImagePlacement(
      1200,
      800,
      { xDpi: 300, yDpi: 300 },
      { pageSize: 'a4', fit: 'contain' }
    );

    expect(placement.pageWidth).toBeCloseTo(595.28, 2);
    expect(placement.pageHeight).toBeCloseTo(841.89, 2);
    expect(placement.width).toBeCloseTo(595.28, 2);
    expect(placement.height).toBeCloseTo(396.85, 1);
    expect(placement.x).toBeCloseTo(0, 5);
    expect(placement.y).toBeCloseTo(222.52, 1);
    // Equal margins on both axes.
    expect(placement.x).toBeCloseTo(placement.pageWidth - placement.x - placement.width, 5);
    expect(placement.y).toBeCloseTo(placement.pageHeight - placement.y - placement.height, 5);
    // Proportions preserved.
    expect(placement.width / placement.height).toBeCloseTo(1200 / 800, 3);
  });

  it('centres a contained tall image with equal side margins on A4', () => {
    const placement = computeImagePlacement(
      800,
      1200,
      { xDpi: 300, yDpi: 300 },
      { pageSize: 'a4', fit: 'contain' }
    );

    expect(placement.height).toBeCloseTo(841.89, 1);
    expect(placement.y).toBeCloseTo(0, 5);
    expect(placement.x).toBeGreaterThan(0);
    expect(placement.x).toBeCloseTo(placement.pageWidth - placement.x - placement.width, 5);
  });
});
