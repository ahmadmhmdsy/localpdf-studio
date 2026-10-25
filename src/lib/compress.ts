import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
} from 'pdf-lib';
import { MAX_COMPRESS_FILE_SIZE_BYTES, MAX_COMPRESS_FILE_SIZE_MB } from '../constants/limits';

/** Only changes how many objects are written per tick while saving; kept for API compatibility. */
export type CompressionLevel = 'low' | 'medium' | 'high';

export interface CompressionResult {
  bytes: Uint8Array;
  notes: string[];
  imagesRecompressed: number;
  imagesSkipped: number;
  /** True when the rewritten file was not smaller, so the input bytes were returned instead. */
  keptOriginal: boolean;
}

export class CompressionCancelledError extends Error {
  constructor() {
    super('Compression was cancelled.');
    this.name = 'CompressionCancelledError';
  }
}

export class CompressionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompressionLimitError';
  }
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new CompressionCancelledError();
}

type SkipReason =
  | 'cmyk'
  | 'indexed'
  | 'colorSpace'
  | 'bitDepth'
  | 'mask'
  | 'decodeParams'
  | 'filter'
  | 'decodeFailed'
  | 'notSmaller';

const SKIP_LABELS: Record<SkipReason, string> = {
  cmyk: 'CMYK',
  indexed: 'indexed colour',
  colorSpace: 'other colour space',
  bitDepth: 'not 8 bits per channel',
  mask: 'transparency or image mask',
  decodeParams: 'decode array or predictor',
  filter: 'unsupported encoding',
  decodeFailed: 'could not be decoded',
  notSmaller: 'would not get smaller',
};

export type SourceImage =
  | { kind: 'jpeg'; bytes: Uint8Array; width: number; height: number }
  | { kind: 'raw'; pixels: Uint8Array; width: number; height: number; components: 1 | 3 };

export interface RecompressOptions {
  maxSide: number;
  quality: number;
}

export interface EncodedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/** Decodes an image, downsamples it to `maxSide`, and re-encodes it as JPEG. */
export interface ImageCodec {
  recompress(image: SourceImage, options: RecompressOptions): Promise<EncodedImage | null>;
}

export type ImageCompression = 'off' | 'light' | 'balanced' | 'strong';

const IMAGE_SETTINGS: Record<Exclude<ImageCompression, 'off'>, { dpi: number; quality: number }> = {
  light: { dpi: 200, quality: 0.8 },
  balanced: { dpi: 150, quality: 0.65 },
  strong: { dpi: 96, quality: 0.5 },
};

// A replacement must save at least 5% or the original stream is kept.
const MIN_SAVING_RATIO = 0.95;

export interface CompressionOptions {
  /** Lossy and irreversible, so it is off unless the user opts in. */
  images?: ImageCompression;
  codec?: ImageCodec;
  /** Checked between images and before saving. */
  signal?: AbortSignal;
}

export async function compressPdf(
  file: File,
  level: CompressionLevel,
  { images = 'off', codec = browserImageCodec, signal }: CompressionOptions = {},
): Promise<CompressionResult> {
  if (file.size > MAX_COMPRESS_FILE_SIZE_BYTES) {
    throw new CompressionLimitError(
      `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Compression is limited to ${MAX_COMPRESS_FILE_SIZE_MB} MB per file.`,
    );
  }
  throwIfCancelled(signal);
  const original = new Uint8Array(await file.arrayBuffer());
  throwIfCancelled(signal);
  const pdf = await PDFDocument.load(original);
  throwIfCancelled(signal);
  const reencodeImages = images !== 'off';
  const { dpi, quality } = IMAGE_SETTINGS[reencodeImages ? images : 'balanced'];

  // Strip metadata on all levels
  pdf.setTitle('');
  pdf.setAuthor('');
  pdf.setSubject('');
  pdf.setKeywords([]);
  pdf.setProducer('');
  pdf.setCreator('');

  // An image never needs more pixels than a full page at the target DPI.
  const longestPageSide = Math.max(
    0,
    ...pdf.getPages().map((page) => Math.max(page.getWidth(), page.getHeight())),
  );
  const maxSide = Math.max(1, Math.round((longestPageSide / 72) * dpi));

  let imagesRecompressed = 0;
  let imagesSkipped = 0;
  const skipped = new Map<SkipReason, number>();
  const skip = (reason: SkipReason) => {
    imagesSkipped++;
    skipped.set(reason, (skipped.get(reason) ?? 0) + 1);
  };

  const objects = reencodeImages ? pdf.context.enumerateIndirectObjects() : [];
  // Soft masks are grayscale images too, but must stay grayscale and unchanged in size.
  const maskRefs = new Set<PDFRef>();
  for (const [, object] of objects) {
    if (!(object instanceof PDFRawStream) || !isImageXObject(object.dict)) continue;
    for (const key of ['SMask', 'Mask']) {
      const value = object.dict.get(PDFName.of(key));
      if (value instanceof PDFRef) maskRefs.add(value);
    }
  }

  for (const [ref, object] of objects) {
    throwIfCancelled(signal);
    if (!(object instanceof PDFRawStream) || !isImageXObject(object.dict)) continue;
    if (maskRefs.has(ref)) {
      skip('mask');
      continue;
    }

    const source = await toSourceImage(object);
    if (typeof source === 'string') {
      skip(source);
      continue;
    }

    let encoded: EncodedImage | null = null;
    try {
      encoded = await codec.recompress(source, { maxSide, quality });
    } catch {
      encoded = null;
    }
    throwIfCancelled(signal);

    if (!encoded) {
      skip('decodeFailed');
      continue;
    }
    if (encoded.bytes.length >= object.contents.length * MIN_SAVING_RATIO) {
      skip('notSmaller');
      continue;
    }

    replaceImage(pdf, ref, object.dict, encoded);
    imagesRecompressed++;
  }

  const imageHint =
    'Images were not changed. Turn on image re-compression for larger savings on scanned or photo-heavy PDFs.';
  const notes = [
    reencodeImages
      ? `Images: ${imagesRecompressed} re-encoded as JPEG (up to ${dpi} DPI, quality ${Math.round(quality * 100)}%), ` +
        `${imagesSkipped} left unchanged.`
      : imageHint,
  ];
  if (imagesSkipped > 0) {
    const reasons = [...skipped].map(([reason, count]) => `${count} ${SKIP_LABELS[reason]}`).join(', ');
    notes.push(`Left unchanged: ${reasons}.`);
  }
  notes.push('Document metadata (title, author, subject, keywords, producer, creator) was removed.');

  throwIfCancelled(signal);
  const bytes = await pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: level === 'high' ? 50 : level === 'medium' ? 100 : 200,
  });
  throwIfCancelled(signal);

  if (bytes.length >= original.length) {
    return {
      bytes: original,
      notes: [
        'The compressed version was not smaller than the original, so the original file was returned unchanged.',
        ...(reencodeImages ? [] : [imageHint]),
      ],
      imagesRecompressed: 0,
      imagesSkipped: imagesSkipped + imagesRecompressed,
      keptOriginal: true,
    };
  }
  return { bytes, notes, imagesRecompressed, imagesSkipped, keptOriginal: false };
}

function isImageXObject(dict: PDFDict): boolean {
  return dict.get(PDFName.of('Subtype')) === PDFName.of('Image');
}

function singleFilter(dict: PDFDict): string | undefined | null {
  const filter = dict.get(PDFName.of('Filter'));
  if (filter === undefined) return undefined;
  if (filter instanceof PDFName) return filter.decodeText();
  if (filter instanceof PDFArray && filter.size() === 1) {
    const only = filter.get(0);
    if (only instanceof PDFName) return only.decodeText();
  }
  // Filter chains and indirect filters are not supported.
  return null;
}

function colorComponents(dict: PDFDict, context: PDFDocument['context']): 1 | 3 | SkipReason {
  const colorSpace = dict.get(PDFName.of('ColorSpace'));
  const resolved = colorSpace instanceof PDFRef ? context.lookup(colorSpace) : colorSpace;
  if (resolved === PDFName.of('DeviceRGB')) return 3;
  if (resolved === PDFName.of('DeviceGray')) return 1;
  if (resolved === PDFName.of('DeviceCMYK')) return 'cmyk';
  if (resolved instanceof PDFArray && resolved.get(0) === PDFName.of('Indexed')) return 'indexed';
  if (resolved instanceof PDFArray && resolved.get(0) === PDFName.of('ICCBased')) {
    const profile = context.lookup(resolved.get(1));
    const n = profile instanceof PDFRawStream ? profile.dict.get(PDFName.of('N')) : undefined;
    if (n instanceof PDFNumber && (n.asNumber() === 1 || n.asNumber() === 3)) {
      return n.asNumber() as 1 | 3;
    }
    if (n instanceof PDFNumber && n.asNumber() === 4) return 'cmyk';
  }
  return 'colorSpace';
}

async function toSourceImage(stream: PDFRawStream): Promise<SourceImage | SkipReason> {
  const { dict } = stream;
  const width = dict.get(PDFName.of('Width'));
  const height = dict.get(PDFName.of('Height'));
  const bpc = dict.get(PDFName.of('BitsPerComponent'));
  if (!(width instanceof PDFNumber) || !(height instanceof PDFNumber)) return 'filter';
  if (dict.get(PDFName.of('ImageMask')) === PDFBool.True) return 'mask';
  if (!(bpc instanceof PDFNumber) || bpc.asNumber() !== 8) return 'bitDepth';
  if (dict.has(PDFName.of('Decode')) || dict.has(PDFName.of('DecodeParms'))) return 'decodeParams';

  const components = colorComponents(dict, stream.dict.context);
  if (typeof components === 'string') return components;

  const w = width.asNumber();
  const h = height.asNumber();
  const filter = singleFilter(dict);

  if (filter === 'DCTDecode') {
    return { kind: 'jpeg', bytes: stream.contents, width: w, height: h };
  }
  if (filter === 'FlateDecode') {
    const pixels = await inflate(stream.contents);
    if (!pixels || pixels.length < w * h * components) return 'filter';
    return { kind: 'raw', pixels, width: w, height: h, components };
  }
  return 'filter';
}

async function inflate(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const body = new Response(data as BodyInit).body;
    if (!body) return null;
    const stream = body.pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

function replaceImage(pdf: PDFDocument, ref: PDFRef, original: PDFDict, encoded: EncodedImage): void {
  const entries: Record<string, unknown> = {
    Type: 'XObject',
    Subtype: 'Image',
    Width: encoded.width,
    Height: encoded.height,
    ColorSpace: 'DeviceRGB',
    BitsPerComponent: 8,
    Filter: 'DCTDecode',
  };
  const replacement = pdf.context.stream(encoded.bytes, entries as never);
  // Keep the transparency mask and rendering hints of the original image.
  for (const key of ['SMask', 'Mask', 'Intent', 'Interpolate']) {
    const value = original.get(PDFName.of(key));
    if (value !== undefined) replacement.dict.set(PDFName.of(key), value);
  }
  pdf.context.assign(ref, replacement);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve(null);
        blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), () => resolve(null));
      },
      'image/jpeg',
      quality,
    );
  });
}

export const browserImageCodec: ImageCodec = {
  async recompress(image, { maxSide, quality }) {
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    let source: CanvasImageSource;
    if (image.kind === 'jpeg') {
      source = await createImageBitmap(new Blob([image.bytes as BlobPart], { type: 'image/jpeg' }));
    } else {
      const full = document.createElement('canvas');
      full.width = image.width;
      full.height = image.height;
      const fullContext = full.getContext('2d');
      if (!fullContext) return null;
      const rgba = new Uint8ClampedArray(image.width * image.height * 4);
      for (let i = 0, p = 0; i < rgba.length; i += 4, p += image.components) {
        const r = image.pixels[p];
        rgba[i] = r;
        rgba[i + 1] = image.components === 3 ? image.pixels[p + 1] : r;
        rgba[i + 2] = image.components === 3 ? image.pixels[p + 2] : r;
        rgba[i + 3] = 255;
      }
      fullContext.putImageData(new ImageData(rgba, image.width, image.height), 0, 0);
      source = full;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    if ('close' in source && typeof source.close === 'function') source.close();

    const bytes = await canvasToJpeg(canvas, quality);
    return bytes ? { bytes, width, height } : null;
  },
};
