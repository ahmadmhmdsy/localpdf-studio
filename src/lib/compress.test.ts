import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn().mockResolvedValue({
      setTitle: vi.fn(),
      setAuthor: vi.fn(),
      setSubject: vi.fn(),
      setKeywords: vi.fn(),
      setProducer: vi.fn(),
      setCreator: vi.fn(),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }),
  },
}));

describe('compressPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a CompressionResult with bytes and notes for "low"', async () => {
    const { compressPdf } = await import('./compress');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await compressPdf(file, 'low');
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('returns a CompressionResult with bytes and notes for "medium"', async () => {
    const { compressPdf } = await import('./compress');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await compressPdf(file, 'medium');
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('returns a CompressionResult with bytes and notes for "high"', async () => {
    const { compressPdf } = await import('./compress');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await compressPdf(file, 'high');
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('always includes a note that pdf-lib cannot re-compress images', async () => {
    const { compressPdf } = await import('./compress');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await compressPdf(file, 'medium');
    const hasNote = result.notes.some((n) => /cannot re-compress/i.test(n));
    expect(hasNote).toBe(true);
  });

  it('clears PDF metadata on every level', async () => {
    const { compressPdf } = await import('./compress');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    await compressPdf(file, 'low');
    const { PDFDocument } = await import('pdf-lib');
    const loadMock = vi.mocked(PDFDocument.load);
    const doc = await loadMock.mock.results[0].value;
    expect(doc.setTitle).toHaveBeenCalledWith('');
    expect(doc.setAuthor).toHaveBeenCalledWith('');
    expect(doc.setProducer).toHaveBeenCalledWith('');
  });
});
