import { describe, it, expect, vi } from 'vitest';

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn().mockResolvedValue({
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }),
  },
}));

describe('unlockPdf', () => {
  it('unlocks PDF with correct password', async () => {
    const { unlockPdf } = await import('./encryption');
    const file = new File(['dummy'], 'protected.pdf', { type: 'application/pdf' });
    const result = await unlockPdf(file, 'test123');
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('protectPdf', () => {
  it('protects PDF with user and owner password', async () => {
    const { protectPdf } = await import('./encryption');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await protectPdf(file, 'user123', 'owner123');
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('protects PDF with permissions', async () => {
    const { protectPdf } = await import('./encryption');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await protectPdf(file, 'user123', 'owner123', {
      printing: true,
      copying: false,
      annotating: true,
      modifying: false,
    });
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('protects PDF with default permissions', async () => {
    const { protectPdf } = await import('./encryption');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await protectPdf(file, 'user123', 'owner123');
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('protects PDF with all permissions disabled', async () => {
    const { protectPdf } = await import('./encryption');
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const result = await protectPdf(file, 'user123', 'owner123', {
      printing: false,
      copying: false,
      annotating: false,
      modifying: false,
    });
    expect(result).toBeInstanceOf(Uint8Array);
  });
});
