import { describe, it, expect, vi } from 'vitest';
import { PDFDocument, PDFName, PDFRawStream, PDFRef } from 'pdf-lib';
import {
  CompressionCancelledError,
  CompressionLimitError,
  compressPdf,
  type ImageCodec,
  type ImageCompression,
} from './compress';
import { MAX_COMPRESS_FILE_SIZE_BYTES } from '../constants/limits';
import { CORPUS, buildCorpusFile } from '../tests/fixtures/compressionCorpus';

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

async function readPdf(bytes: Uint8Array): Promise<{ pageCount: number; text: string[] }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // pdf.js may transfer the buffer, so give it a copy.
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  const doc = await task.promise;
  const text: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    text.push((items as { str: string }[]).map((i) => i.str).join(''));
  }
  const pageCount = doc.numPages;
  await task.destroy();
  return { pageCount, text };
}

const PRESETS: ImageCompression[] = ['off', 'light', 'balanced', 'strong'];

describe.each(PRESETS)('compressPdf on the generated corpus, preset %s', (preset) => {
  it.each(CORPUS)('%s: never grows, keeps pages and text', async (name) => {
    const { file, pageText } = await buildCorpusFile(name);
    const original = new Uint8Array(await file.arrayBuffer());
    const result = await compressPdf(file, 'medium', { images: preset, codec: smallJpegCodec() });

    expect(result.bytes.length).toBeLessThanOrEqual(original.length);
    if (result.keptOriginal) {
      expect(result.bytes).toEqual(original);
      expect(result.notes[0]).toMatch(/original file was returned unchanged/);
    }
    const { pageCount, text } = await readPdf(result.bytes);
    expect(pageCount).toBe(pageText.length);
    expect(text).toEqual(pageText);
  });

  it('shrinks the JPEG-heavy scan', async () => {
    const { file } = await buildCorpusFile('jpegScan');
    const result = await compressPdf(file, 'medium', { images: preset, codec: smallJpegCodec() });

    expect(result.bytes.length).toBeLessThan(file.size);
    expect(result.imagesRecompressed).toBe(preset === 'off' ? 0 : 3);
    if (preset !== 'off') expect(result.bytes.length).toBeLessThan(file.size / 10);
  });
});

describe('compressPdf skip notes', () => {
  it.each([
    ['cmykJpeg', /1 CMYK/],
    ['indexedPng', /1 indexed colour/],
  ] as const)('%s is listed as left unchanged', async (name, pattern) => {
    const codec = smallJpegCodec();
    const { file } = await buildCorpusFile(name);
    const result = await compressPdf(file, 'medium', { images: 'balanced', codec });

    expect(codec.recompress).not.toHaveBeenCalled();
    expect(result.notes.join(' ')).toMatch(pattern);
  });

  it('re-encodes an image with alpha and keeps its soft mask', async () => {
    const { file, imageRefs } = await buildCorpusFile('pngWithAlpha');
    const result = await compressPdf(file, 'medium', { images: 'balanced', codec: smallJpegCodec() });

    expect(result.imagesRecompressed).toBe(1);
    const stream = await imageStream(result.bytes, imageRefs[0]);
    expect(stream.dict.get(PDFName.of('Filter'))).toBe(PDFName.of('DCTDecode'));
    const maskRef = stream.dict.get(PDFName.of('SMask'));
    expect(maskRef).toBeInstanceOf(PDFRef);
    // The mask itself must stay a grayscale Flate image.
    const mask = await imageStream(result.bytes, maskRef as PDFRef);
    expect(mask.dict.get(PDFName.of('ColorSpace'))).toBe(PDFName.of('DeviceGray'));
    expect(mask.dict.get(PDFName.of('Filter'))).toBe(PDFName.of('FlateDecode'));
    expect(result.notes.join(' ')).toMatch(/1 transparency or image mask/);
  });

  it('lists codec failures and too-large results by reason', async () => {
    const bigger: ImageCodec = { recompress: async () => ({ bytes: new Uint8Array(40_000), width: 64, height: 64 }) };
    const { file } = await buildCorpusFile('jpegScan');
    const result = await compressPdf(file, 'medium', { images: 'strong', codec: bigger });

    expect(result.notes.join(' ')).toMatch(/3 would not get smaller/);
  });
});

describe('compressPdf never returns a larger file', () => {
  it('returns the original bytes when the rewrite is not smaller', async () => {
    const { file } = await buildCorpusFile('alreadyOptimized');
    const original = new Uint8Array(await file.arrayBuffer());
    const result = await compressPdf(file, 'medium');

    expect(result.keptOriginal).toBe(true);
    expect(result.bytes).toEqual(original);
    expect(result.imagesRecompressed).toBe(0);
    expect(result.notes[0]).toMatch(/original file was returned unchanged/);
  });

  it('keeps the original when compressing its own output again', async () => {
    const { file } = await buildCorpusFile('jpegScan');
    const once = await compressPdf(file, 'medium', { images: 'balanced', codec: smallJpegCodec() });
    const again = await compressPdf(new File([once.bytes as BlobPart], 'once.pdf'), 'medium', {
      images: 'balanced',
      codec: smallJpegCodec(),
    });

    expect(again.keptOriginal).toBe(true);
    expect(again.bytes).toEqual(once.bytes);
  });

  it('reports keptOriginal false when the file got smaller', async () => {
    const { file } = await buildCorpusFile('jpegScan');
    const result = await compressPdf(file, 'medium', { images: 'balanced', codec: smallJpegCodec() });
    expect(result.keptOriginal).toBe(false);
  });
});

describe('compressPdf cancellation and limits', () => {
  it('refuses a file over the size limit before reading it', async () => {
    const file = new File([new Uint8Array(1)], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: MAX_COMPRESS_FILE_SIZE_BYTES + 1 });
    const read = vi.spyOn(file, 'arrayBuffer');

    await expect(compressPdf(file, 'medium')).rejects.toBeInstanceOf(CompressionLimitError);
    await expect(compressPdf(file, 'medium')).rejects.toThrow(/limited to 100 MB/);
    expect(read).not.toHaveBeenCalled();
  });

  it('throws a cancel error for an already-aborted signal', async () => {
    const { file } = await buildCorpusFile('textOnly');
    const controller = new AbortController();
    controller.abort();

    await expect(compressPdf(file, 'medium', { signal: controller.signal })).rejects.toBeInstanceOf(
      CompressionCancelledError,
    );
  });

  it('stops between images when aborted during re-encoding', async () => {
    const controller = new AbortController();
    const codec: ImageCodec = {
      recompress: vi.fn(async () => {
        controller.abort();
        return { bytes: new Uint8Array(10), width: 64, height: 64 };
      }),
    };
    const { file } = await buildCorpusFile('jpegScan');

    await expect(
      compressPdf(file, 'medium', { images: 'balanced', codec, signal: controller.signal }),
    ).rejects.toBeInstanceOf(CompressionCancelledError);
    expect(codec.recompress).toHaveBeenCalledTimes(1);
  });
});
