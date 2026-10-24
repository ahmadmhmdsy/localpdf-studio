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

export type CompressionLevel = 'low' | 'medium' | 'high';

export interface CompressionResult {
  bytes: Uint8Array;
  notes: string[];
  imagesRecompressed: number;
  imagesSkipped: number;
}

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
}

export async function compressPdf(
  file: File,
  level: CompressionLevel,
  { images = 'off', codec = browserImageCodec }: CompressionOptions = {},
): Promise<CompressionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
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

  for (const [ref, object] of reencodeImages ? pdf.context.enumerateIndirectObjects() : []) {
    if (!(object instanceof PDFRawStream) || !isImageXObject(object.dict)) continue;

    const source = await toSourceImage(object);
    if (!source) {
      imagesSkipped++;
      continue;
    }

    let encoded: EncodedImage | null = null;
    try {
      encoded = await codec.recompress(source, { maxSide, quality });
    } catch {
      encoded = null;
    }

    if (!encoded || encoded.bytes.length >= object.contents.length * MIN_SAVING_RATIO) {
      imagesSkipped++;
      continue;
    }

    replaceImage(pdf, ref, object.dict, encoded);
    imagesRecompressed++;
  }

  const notes = [
    reencodeImages
      ? `Images: ${imagesRecompressed} re-encoded as JPEG (up to ${dpi} DPI, quality ${Math.round(quality * 100)}%), ` +
        `${imagesSkipped} left unchanged.`
      : 'Images were not changed. Turn on image re-compression for larger savings on scanned or photo-heavy PDFs.',
  ];
  if (imagesSkipped > 0) {
    notes.push(
      'Images are left unchanged when re-encoding would not make them smaller, or when their format ' +
        '(CMYK, indexed colour, 16-bit, masks, predictors) is not supported.',
    );
  }
  notes.push('Document metadata (title, author, subject, keywords, producer, creator) was removed.');

  const bytes = await pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: level === 'high' ? 50 : level === 'medium' ? 100 : 200,
  });
  return { bytes, notes, imagesRecompressed, imagesSkipped };
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

function colorComponents(dict: PDFDict, context: PDFDocument['context']): 1 | 3 | null {
  const colorSpace = dict.get(PDFName.of('ColorSpace'));
  const resolved = colorSpace instanceof PDFRef ? context.lookup(colorSpace) : colorSpace;
  if (resolved === PDFName.of('DeviceRGB')) return 3;
  if (resolved === PDFName.of('DeviceGray')) return 1;
  if (resolved instanceof PDFArray && resolved.get(0) === PDFName.of('ICCBased')) {
    const profile = context.lookup(resolved.get(1));
    const n = profile instanceof PDFRawStream ? profile.dict.get(PDFName.of('N')) : undefined;
    if (n instanceof PDFNumber && (n.asNumber() === 1 || n.asNumber() === 3)) {
      return n.asNumber() as 1 | 3;
    }
  }
  return null;
}

async function toSourceImage(stream: PDFRawStream): Promise<SourceImage | null> {
  const { dict } = stream;
  const width = dict.get(PDFName.of('Width'));
  const height = dict.get(PDFName.of('Height'));
  const bpc = dict.get(PDFName.of('BitsPerComponent'));
  if (!(width instanceof PDFNumber) || !(height instanceof PDFNumber)) return null;
  if (!(bpc instanceof PDFNumber) || bpc.asNumber() !== 8) return null;
  if (dict.get(PDFName.of('ImageMask')) === PDFBool.True) return null;
  if (dict.has(PDFName.of('Decode')) || dict.has(PDFName.of('DecodeParms'))) return null;

  const components = colorComponents(dict, stream.dict.context);
  if (components === null) return null;

  const w = width.asNumber();
  const h = height.asNumber();
  const filter = singleFilter(dict);

  if (filter === 'DCTDecode') {
    return { kind: 'jpeg', bytes: stream.contents, width: w, height: h };
  }
  if (filter === 'FlateDecode') {
    const pixels = await inflate(stream.contents);
    if (!pixels || pixels.length < w * h * components) return null;
    return { kind: 'raw', pixels, width: w, height: h, components };
  }
  return null;
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
