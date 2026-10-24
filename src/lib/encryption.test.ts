import { describe, it, expect } from 'vitest';
import { protectPdf, unlockPdf, EncryptionNotSupportedError } from './encryption';

describe('protectPdf', () => {
  it('throws EncryptionNotSupportedError', async () => {
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    await expect(protectPdf(file, 'user123', 'owner123')).rejects.toThrow(EncryptionNotSupportedError);
  });

  it('explains that pdf-lib does not support encryption', async () => {
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    await expect(protectPdf(file, 'user123', 'owner123')).rejects.toThrow(/pdf-lib.*does not implement PDF encryption/);
  });
});

describe('unlockPdf', () => {
  it('throws EncryptionNotSupportedError', async () => {
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    await expect(unlockPdf(file, 'password')).rejects.toThrow(EncryptionNotSupportedError);
  });

  it('explains that pdf-lib does not support decryption', async () => {
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    await expect(unlockPdf(file, 'password')).rejects.toThrow(/pdf-lib.*does not implement PDF encryption/);
  });
});
