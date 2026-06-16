import { PDFDocument } from 'pdf-lib';

export type CompressionLevel = 'low' | 'medium' | 'high';

export interface CompressionResult {
  bytes: Uint8Array;
  notes: string[];
}

const NOTE_NO_IMAGE_RECOMPRESSION =
  'pdf-lib cannot re-compress images embedded in the PDF. ' +
  'Compression is limited to: (1) removing metadata, (2) re-packing content streams with object streams.';

export async function compressPdf(
  file: File,
  level: CompressionLevel,
): Promise<CompressionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);

  const notes: string[] = [NOTE_NO_IMAGE_RECOMPRESSION];

  pdf.setTitle('');
  pdf.setAuthor('');
  pdf.setSubject('');
  pdf.setKeywords([]);
  pdf.setProducer('');
  pdf.setCreator('');

  // pdf-lib does not support re-quantising JPEGs or downsampling images.
  // The only meaningful size lever is `useObjectStreams`, which re-packs
  // objects into compressed cross-reference streams. We use it for every
  // level; the parameter here controls other (smaller) tradeoffs only.
  const useObjectStreams = true;
  const addDefaultPage = false;
  const objectsPerTick = level === 'high' ? 50 : level === 'medium' ? 100 : 200;

  notes.push(
    `Level "${level}" applied. ` +
      'If the source PDF already had efficient object streams, the size reduction may be minimal.',
  );

  const bytes = await pdf.save({
    useObjectStreams,
    addDefaultPage,
    objectsPerTick,
  });
  return { bytes, notes };
}
