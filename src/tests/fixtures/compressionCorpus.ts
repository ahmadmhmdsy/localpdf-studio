import {
  PDFDocument,
  PDFName,
  PDFRef,
  StandardFonts,
  concatTransformationMatrix,
  drawObject,
  popGraphicsState,
  pushGraphicsState,
} from 'pdf-lib';

/**
 * Generated PDFs that cover the image kinds compression must handle. The image
 * streams hold pseudo-random bytes rather than decodable pictures: jsdom cannot
 * decode or encode JPEG, so tests pair these with a stub codec and only check
 * how the PDF is rewritten. Real pixels are checked in a browser.
 */
export type CorpusName =
  | 'jpegScan'
  | 'pngWithAlpha'
  | 'cmykJpeg'
  | 'indexedPng'
  | 'textOnly'
  | 'alreadyOptimized';

export interface CorpusFile {
  file: File;
  /** The text drawn on each page, in page order. */
  pageText: string[];
  /** The image XObjects drawn on the pages. */
  imageRefs: PDFRef[];
}

const PAGE: [number, number] = [612, 792];
const IMAGE_SIDE = 64;

// A fixed-seed generator, so fixtures are identical on every run.
function noise(length: number, seed: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let state = seed >>> 0;
  for (let i = 0; i < length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    bytes[i] = state >>> 24;
  }
  return bytes;
}

type ImageKind = 'jpeg' | 'cmykJpeg' | 'rgbWithAlpha' | 'indexed';

function addImage(pdf: PDFDocument, kind: ImageKind, seed: number): PDFRef {
  const base = { Type: 'XObject', Subtype: 'Image', Width: IMAGE_SIDE, Height: IMAGE_SIDE, BitsPerComponent: 8 };
  const pixels = IMAGE_SIDE * IMAGE_SIDE;
  switch (kind) {
    case 'jpeg':
      return pdf.context.register(
        pdf.context.stream(noise(30_000, seed), { ...base, ColorSpace: 'DeviceRGB', Filter: 'DCTDecode' } as never),
      );
    case 'cmykJpeg':
      return pdf.context.register(
        pdf.context.stream(noise(30_000, seed), { ...base, ColorSpace: 'DeviceCMYK', Filter: 'DCTDecode' } as never),
      );
    case 'rgbWithAlpha': {
      const alpha = pdf.context.register(
        pdf.context.flateStream(noise(pixels, seed + 1), { ...base, ColorSpace: 'DeviceGray' } as never),
      );
      return pdf.context.register(
        pdf.context.flateStream(noise(pixels * 3, seed), { ...base, ColorSpace: 'DeviceRGB', SMask: alpha } as never),
      );
    }
    case 'indexed': {
      const palette = pdf.context.flateStream(noise(256 * 3, seed + 1));
      const colorSpace = pdf.context.obj([PDFName.of('Indexed'), PDFName.of('DeviceRGB'), 255, pdf.context.register(palette)]);
      return pdf.context.register(
        pdf.context.flateStream(noise(pixels, seed), { ...base, ColorSpace: colorSpace } as never),
      );
    }
  }
}

async function build(
  name: string,
  pages: { text: string; image?: ImageKind }[],
  save: { useObjectStreams: boolean; metadata: boolean },
): Promise<CorpusFile> {
  const pdf = await PDFDocument.create();
  if (save.metadata) {
    pdf.setTitle(`${name} title`);
    pdf.setAuthor('Corpus author');
  } else {
    pdf.setProducer('');
    pdf.setCreator('');
  }
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const imageRefs: PDFRef[] = [];

  pages.forEach(({ text, image }, index) => {
    const page = pdf.addPage(PAGE);
    if (image) {
      const ref = addImage(pdf, image, index + 1);
      imageRefs.push(ref);
      const key = page.node.newXObject('Im', ref);
      page.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(500, 0, 0, 500, 56, 200),
        drawObject(key),
        popGraphicsState(),
      );
    }
    page.drawText(text, { x: 56, y: 740, size: 14, font });
  });

  const bytes = await pdf.save({ useObjectStreams: save.useObjectStreams, addDefaultPage: false });
  return {
    file: new File([bytes as BlobPart], `${name}.pdf`, { type: 'application/pdf' }),
    pageText: pages.map((p) => p.text),
    imageRefs,
  };
}

const unoptimized = { useObjectStreams: false, metadata: true };

export function buildCorpusFile(name: CorpusName): Promise<CorpusFile> {
  switch (name) {
    case 'jpegScan':
      return build(
        name,
        [1, 2, 3].map((n) => ({ text: `Scanned page ${n}`, image: 'jpeg' as const })),
        unoptimized,
      );
    case 'pngWithAlpha':
      return build(name, [{ text: 'Logo with transparency', image: 'rgbWithAlpha' }], unoptimized);
    case 'cmykJpeg':
      return build(name, [{ text: 'Print-ready CMYK photo', image: 'cmykJpeg' }], unoptimized);
    case 'indexedPng':
      return build(name, [{ text: 'Palette chart', image: 'indexed' }], unoptimized);
    case 'textOnly':
      return build(
        name,
        [1, 2].map((n) => ({ text: `Plain text page ${n}` })),
        unoptimized,
      );
    case 'alreadyOptimized':
      return build(name, [{ text: 'Already optimized' }], { useObjectStreams: true, metadata: false });
  }
}

export const CORPUS: CorpusName[] = ['jpegScan', 'pngWithAlpha', 'cmykJpeg', 'indexedPng', 'textOnly', 'alreadyOptimized'];
