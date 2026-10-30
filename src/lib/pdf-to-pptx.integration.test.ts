import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

// Mock pdfjs to return a proper promise with render method
vi.mock('./pdfjs', () => ({
  pdfjsLib: {
    getDocument: vi.fn(() => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn(() => Promise.resolve({
          getViewport: vi.fn(() => ({ width: 612, height: 792 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        })),
      }),
    })),
  },
}));

// Mock canvas - return different number of thumbnails based on file
vi.mock('./image', () => ({
  getPdfPageThumbnails: vi.fn((file: File) => {
    // Return 3 thumbnails for multi-page test, 1 for others
    const count = file.name.includes('multi') ? 3 : 1;
    const thumbnails = Array.from({ length: count }, () => 
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q=='
    );
    return Promise.resolve(thumbnails);
  }),
}));

import { convertPdfToPowerpoint } from './pdf-to-pptx';

describe('pdf-to-pptx integration', () => {
  it('converts a single-page PDF to PPTX', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test slide content', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'test.pdf', { type: 'application/pdf' });

    const result = await convertPdfToPowerpoint(file);

    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBeGreaterThan(0);
  });

  it('produces a valid PPTX file that can be unzipped', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test slide', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'test.pdf', { type: 'application/pdf' });

    const result = await convertPdfToPowerpoint(file);

    // Verify the output is a valid ZIP file (PPTX is a ZIP archive)
    const arrayBuffer = await result.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    expect(zip).toBeDefined();
  });

  it('includes required PPTX structure files', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test slide', { x: 50, y: 700, size: 12 });
    const bytes = await pdf.save();
    const file = new File([bytes], 'test.pdf', { type: 'application/pdf' });

    const result = await convertPdfToPowerpoint(file);
    const arrayBuffer = await result.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Check for required PPTX files
    expect(zip.file('[Content_Types].xml')).toBeTruthy();
    expect(zip.file('ppt/presentation.xml')).toBeTruthy();
    expect(zip.file('ppt/slides/slide1.xml')).toBeTruthy();
  });

  it('handles multi-page PDFs', async () => {
    const pdf = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
      const page = pdf.addPage([612, 792]);
      page.drawText(`Slide ${i + 1}`, { x: 50, y: 700, size: 12 });
    }
    const bytes = await pdf.save();
    const file = new File([bytes], 'multi-page.pdf', { type: 'application/pdf' });

    const result = await convertPdfToPowerpoint(file);
    const arrayBuffer = await result.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Should have 3 slides
    expect(zip.file('ppt/slides/slide1.xml')).toBeTruthy();
    expect(zip.file('ppt/slides/slide2.xml')).toBeTruthy();
    expect(zip.file('ppt/slides/slide3.xml')).toBeTruthy();
  });

  describe('package structure', () => {
    const CONTENT_TYPES = '[Content_Types].xml';
    const RELATIONSHIP_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');
    const attributes = (doc: Document, tag: string, name: string) =>
      Array.from(doc.getElementsByTagName(tag)).map((node) => node.getAttribute(name) ?? '');

    const loadPackage = async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage([612, 792]);
      const file = new File([await pdf.save()], 'multi-page.pdf', { type: 'application/pdf' });
      const zip = await JSZip.loadAsync(await (await convertPdfToPowerpoint(file)).arrayBuffer());
      const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
      const xml = async (name: string) => zip.file(name)!.async('string');
      return { names, xml };
    };

    /** The part a relationship points at, as a package path. */
    const resolveTarget = (relsPath: string, target: string) => {
      const source = relsPath.replace(/_rels\/([^/]*)\.rels$/, '$1');
      return new URL(target, `http://package/${source}`).pathname.slice(1);
    };

    const relationshipsOf = async (pkg: Awaited<ReturnType<typeof loadPackage>>, part: string) => {
      const slash = part.lastIndexOf('/');
      const relsPath = `${part.slice(0, slash + 1)}_rels/${part.slice(slash + 1)}.rels`;
      const doc = parse(await pkg.xml(relsPath));
      return Array.from(doc.getElementsByTagName('Relationship')).map((node) => ({
        type: node.getAttribute('Type'),
        target: resolveTarget(relsPath, node.getAttribute('Target') ?? ''),
      }));
    };

    it('writes well-formed XML in every part', async () => {
      const pkg = await loadPackage();
      for (const name of pkg.names.filter((part) => /\.(xml|rels)$/.test(part))) {
        expect(parse(await pkg.xml(name)).getElementsByTagName('parsererror'), name).toHaveLength(0);
      }
    });

    it('declares a content type for every part, and every declared part exists', async () => {
      const pkg = await loadPackage();
      const types = parse(await pkg.xml(CONTENT_TYPES));
      const overrides = attributes(types, 'Override', 'PartName').map((part) => part.slice(1));
      const extensions = attributes(types, 'Default', 'Extension');

      for (const part of overrides) expect(pkg.names, part).toContain(part);
      for (const name of pkg.names.filter((part) => part !== CONTENT_TYPES)) {
        const extension = name.slice(name.lastIndexOf('.') + 1);
        expect(overrides.includes(name) || extensions.includes(extension), name).toBe(true);
      }
    });

    it('resolves every relationship to a part in the package', async () => {
      const pkg = await loadPackage();
      for (const relsPath of pkg.names.filter((part) => part.endsWith('.rels'))) {
        const doc = parse(await pkg.xml(relsPath));
        const ids = attributes(doc, 'Relationship', 'Id');
        expect(new Set(ids).size, relsPath).toBe(ids.length);
        for (const target of attributes(doc, 'Relationship', 'Target')) {
          expect(pkg.names, `${relsPath} -> ${target}`).toContain(resolveTarget(relsPath, target));
        }
      }
    });

    it('registers the slide master before the slides in the presentation', async () => {
      const pkg = await loadPackage();
      const presentation = parse(await pkg.xml('ppt/presentation.xml')).documentElement;
      const children = Array.from(presentation.children).map((node) => node.localName);
      expect(presentation.getElementsByTagName('p:sldMasterId')).toHaveLength(1);
      expect(children.indexOf('sldMasterIdLst')).toBeGreaterThanOrEqual(0);
      expect(children.indexOf('sldMasterIdLst')).toBeLessThan(children.indexOf('sldIdLst'));
    });

    it('gives the master a complete theme', async () => {
      const pkg = await loadPackage();
      const relationships = await relationshipsOf(pkg, 'ppt/slideMaster/slideMaster1.xml');
      const theme = relationships.find((rel) => rel.type === `${RELATIONSHIP_TYPE}/theme`);
      expect(theme?.target).toBe('ppt/theme/theme1.xml');

      const doc = parse(await pkg.xml('ppt/theme/theme1.xml'));
      for (const part of ['a:clrScheme', 'a:fontScheme', 'a:fmtScheme']) {
        expect(doc.getElementsByTagName(part), part).toHaveLength(1);
      }
    });

    it('links every slide to the layout and its own image', async () => {
      const pkg = await loadPackage();
      const slides = pkg.names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
      expect(slides).toHaveLength(3);
      for (const [index, slide] of slides.entries()) {
        const relationships = await relationshipsOf(pkg, slide);
        expect(relationships).toContainEqual({
          type: `${RELATIONSHIP_TYPE}/slideLayout`,
          target: 'ppt/slideLayout/slideLayout1.xml',
        });
        expect(relationships).toContainEqual({
          type: `${RELATIONSHIP_TYPE}/image`,
          target: `ppt/media/image${index + 1}.jpg`,
        });
      }
    });
  });
});
