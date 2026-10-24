import { describe, it, expect, vi } from 'vitest';
import { PDFDocument, PDFName, PDFRawStream, PDFRef } from 'pdf-lib';
import { compressPdf, type ImageCodec } from './compress';

type ImageSpec = { filter: 'DCTDecode' | 'FlateDecode'; colorSpace?: string; size?: number; extra?: Record<string, unknown> };

async function buildPdf(images: ImageSpec[]): Promise<{ file: File; refs: PDFRef[] }> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Secret title');
  pdf.addPage([612, 792]);
  const refs = images.map(({ filter, colorSpace = 'DeviceRGB', size = 4000, extra = {} }) => {
    const width = 20;
    const height = 20;
    const dict = { Type: 'XObject', Subtype: 'Image', Width: width, Height: height, ColorSpace: colorSpace, BitsPerComponent: 8, ...extra };
    const stream =
      filter === 'FlateDecode'
        ? pdf.context.flateStream(new Uint8Array(width * height * 3).fill(200), dict as never)
        : pdf.context.stream(new Uint8Array(size).fill(7), { ...dict, Filter: 'DCTDecode' } as never);
    return pdf.context.register(stream);
  });
  const bytes = await pdf.save({ useObjectStreams: false });
  return { file: new File([bytes as BlobPart], 'test.pdf', { type: 'application/pdf' }), refs };
}

// A fresh mock per test, so recorded calls never leak between tests.
function smallJpegCodec(): ImageCodec {
  return {
    recompress: vi.fn(async (_image, { maxSide }) => ({ bytes: new Uint8Array(10).fill(1), width: Math.min(20, maxSide), height: Math.min(20, maxSide) })),
  };
}

async function imageStream(bytes: Uint8Array, ref: PDFRef): Promise<PDFRawStream> {
  const doc = await PDFDocument.load(bytes);
  return doc.context.lookup(ref) as PDFRawStream;
}

describe('compressPdf', () => {
  it('re-encodes a JPEG image when the result is smaller', async () => {
    const { file, refs } = await buildPdf([{ filter: 'DCTDecode' }]);
    const result = await compressPdf(file, 'medium', { images: 'balanced', codec: smallJpegCodec() });

    expect(result.imagesRecompressed).toBe(1);
    expect(result.imagesSkipped).toBe(0);
    const stream = await imageStream(result.bytes, refs[0]);
    expect(stream.contents.length).toBe(10);
    expect(stream.dict.get(PDFName.of('Filter'))).toBe(PDFName.of('DCTDecode'));
  });

  it('decodes Flate RGB images and passes raw pixels to the codec', async () => {
    const codec = smallJpegCodec();
    const { file } = await buildPdf([{ filter: 'FlateDecode' }]);
    const result = await compressPdf(file, 'low', { images: 'light', codec });

    const [image] = vi.mocked(codec.recompress).mock.calls[0];
    expect(image).toMatchObject({ kind: 'raw', width: 20, height: 20, components: 3 });
    // A uniform image deflates to fewer bytes than the stub's output, so it is kept.
    expect(result.imagesRecompressed + result.imagesSkipped).toBe(1);
  });

  it('keeps the original when re-encoding would not save space', async () => {
    const bigger: ImageCodec = { recompress: async () => ({ bytes: new Uint8Array(5000), width: 20, height: 20 }) };
    const { file, refs } = await buildPdf([{ filter: 'DCTDecode' }]);
    const result = await compressPdf(file, 'high', { images: 'strong', codec: bigger });

    expect(result.imagesRecompressed).toBe(0);
    expect(result.imagesSkipped).toBe(1);
    expect((await imageStream(result.bytes, refs[0])).contents.length).toBe(4000);
  });

  it('skips unsupported image types without calling the codec', async () => {
    const codec = smallJpegCodec();
    const { file } = await buildPdf([
      { filter: 'DCTDecode', colorSpace: 'DeviceCMYK' },
      { filter: 'DCTDecode', extra: { Decode: [1, 0, 1, 0, 1, 0] } },
    ]);
    const result = await compressPdf(file, 'medium', { images: 'balanced', codec });

    expect(codec.recompress).not.toHaveBeenCalled();
    expect(result.imagesSkipped).toBe(2);
  });

  it('keeps an image when the codec fails', async () => {
    const failing: ImageCodec = { recompress: async () => { throw new Error('decode failed'); } };
    const { file } = await buildPdf([{ filter: 'DCTDecode' }]);
    const result = await compressPdf(file, 'medium', { images: 'balanced', codec: failing });

    expect(result.imagesSkipped).toBe(1);
  });

  it('caps image size by preset DPI relative to the largest page', async () => {
    const codec = smallJpegCodec();
    const { file } = await buildPdf([{ filter: 'DCTDecode' }]);

    await compressPdf(file, 'high', { images: 'strong', codec });
    await compressPdf(file, 'low', { images: 'light', codec });

    const [[, high], [, low]] = vi.mocked(codec.recompress).mock.calls;
    expect(high.maxSide).toBe(Math.round((792 / 72) * 96));
    expect(low.maxSide).toBe(Math.round((792 / 72) * 200));
    expect(high.quality).toBeLessThan(low.quality);
  });

  it('leaves images untouched unless re-encoding is turned on', async () => {
    const codec = smallJpegCodec();
    const { file, refs } = await buildPdf([{ filter: 'DCTDecode' }]);
    const result = await compressPdf(file, 'high', { codec });

    expect(codec.recompress).not.toHaveBeenCalled();
    expect(result.imagesRecompressed).toBe(0);
    expect((await imageStream(result.bytes, refs[0])).contents.length).toBe(4000);
    expect(result.notes[0]).toMatch(/not changed/);
  });

  it('clears metadata and reports what changed', async () => {
    const { file } = await buildPdf([]);
    const result = await compressPdf(file, 'low', { images: 'light', codec: smallJpegCodec() });

    const doc = await PDFDocument.load(result.bytes);
    expect(doc.getTitle() ?? '').toBe('');
    expect(result.notes.some((n) => /metadata/i.test(n))).toBe(true);
    expect(result.notes.some((n) => /0 re-encoded/.test(n))).toBe(true);
  });
});
