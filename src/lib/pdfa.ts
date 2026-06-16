import { PDFDocument, PDFName, PDFString } from 'pdf-lib';

export type PdfALevel = '1b' | '2b' | '3b';

export interface PdfAConversionResult {
  bytes: Uint8Array;
  level: PdfALevel;
  notes: string[];
  isCompliant: false;
}

const PDFA_DISCLAIMER =
  'This output is NOT validated PDF/A. It has best-effort PDF/A-style metadata only. ' +
  'For guaranteed conformance, validate with veraPDF or a comparable tool after download.';

export async function convertToPdfA(
  file: File,
  level: PdfALevel = '2b',
): Promise<PdfAConversionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);

  const notes: string[] = [PDFA_DISCLAIMER];
  const now = new Date();

  pdf.setTitle(pdf.getTitle() || 'Converted Document');
  pdf.setAuthor(pdf.getAuthor() || 'LocalPDF Studio');
  pdf.setCreator('LocalPDF Studio PDF/A Converter (best-effort)');
  pdf.setProducer('LocalPDF Studio');
  pdf.setCreationDate(now);
  pdf.setModificationDate(now);

  const pdfContext = pdf.context;
  const catalog = pdf.catalog;

  const outputIntentDict = pdfContext.obj({
    Type: PDFName.of('OutputIntent'),
    S: PDFName.of('GTS_PDFA1'),
    OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
  });

  const outputIntents = pdfContext.obj([outputIntentDict]);
  catalog.set(PDFName.of('OutputIntents'), outputIntents);

  notes.push(
    'OutputIntent added with sRGB identifier, but no ICC profile is embedded. ' +
      'Most strict PDF/A validators will reject the output for this reason.',
  );
  notes.push(
    'Fonts, transparency, encryption, and other PDF/A rules are not enforced. ' +
      'Embedded fonts and transparency in the source PDF may violate conformance.',
  );

  const xmpMetadata = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>${level.startsWith('1') ? '1' : level.startsWith('2') ? '2' : '3'}</pdfaid:part>
      <pdfaid:conformance>${level.slice(-1).toUpperCase()}</pdfaid:conformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const metadataStream = pdfContext.stream(xmpMetadata, {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  });

  const metadataRef = pdfContext.register(metadataStream);
  catalog.set(PDFName.of('Metadata'), metadataRef);

  const bytes = await pdf.save();
  return { bytes, level, notes, isCompliant: false };
}
