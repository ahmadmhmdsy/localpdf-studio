import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { protectPdf, unlockPdf, PdfPermissions } from './encryption';

vi.mock('pdf-lib', async () => {
  const actual = await vi.importActual<typeof import('pdf-lib')>('pdf-lib');
  return { ...actual };
});

async function makeRealPdf(): Promise<File> {
  const doc = await PDFDocument.create();
  doc.addPage([300, 300]);
  const bytes = await doc.save();
  return new File([bytes], 'test.pdf', { type: 'application/pdf' });
}

describe('protectPdf', () => {
  it('produces a valid PDF', async () => {
    const file = await makeRealPdf();
    const out = await protectPdf(file, 'user123', 'owner123');
    expect(out).toBeInstanceOf(Uint8Array);
    // Re-open to verify it's a real PDF
    const reopened = await PDFDocument.load(out, { ignoreEncryption: true });
    expect(reopened.getPageCount()).toBe(1);
  });

  it('applies all permission combinations without error', async () => {
    const file = await makeRealPdf();
    const cases: PdfPermissions[] = [
      { printing: true, copying: true, annotating: true, modifying: true },
      { printing: false, copying: false, annotating: false, modifying: false },
      { printing: true, copying: false, annotating: false, modifying: false },
    ];
    for (const permissions of cases) {
      const out = await protectPdf(file, 'u', 'o', permissions);
      expect(out.byteLength).toBeGreaterThan(0);
    }
  });
});

describe('unlockPdf', () => {
  it('returns the PDF bytes when given a non-encrypted PDF (password is ignored)', async () => {
    // pdf-lib's `password` LoadOption is silently ignored when the PDF isn't encrypted,
    // so unlockPdf on a plain PDF is effectively a round-trip.
    const file = await makeRealPdf();
    const out = await unlockPdf(file, 'whatever');
    expect(out).toBeInstanceOf(Uint8Array);
    const reopened = await PDFDocument.load(out);
    expect(reopened.getPageCount()).toBe(1);
  });
});