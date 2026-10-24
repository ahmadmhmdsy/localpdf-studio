/**
 * PDF encryption/decryption via pdf-lib.
 *
 * IMPORTANT: pdf-lib 1.17.1 does NOT support encryption in its save() method.
 * The save() method only accepts: useObjectStreams, addDefaultPage,
 * objectsPerTick, and updateFieldAppearances. Passing userPassword/ownerPassword
 * is silently ignored, producing an unencrypted PDF.
 *
 * These functions are kept as stubs that throw clear errors. The Protect and
 * Decrypt tools are blocked by ToolAvailabilityGate (releaseState: 'disabled').
 *
 * To implement real encryption, consider:
 *   - A WASM-based PDF library (e.g., qpdf compiled to WASM)
 *   - A server-side encryption endpoint
 *   - A browser-native SubtleCrypto-based approach (complex, non-standard)
 */

export interface PdfPermissions {
  printing?: boolean;
  modifying?: boolean;
  copying?: boolean;
  annotating?: boolean;
}

export class EncryptionNotSupportedError extends Error {
  constructor(feature: string) {
    super(
      `${feature} is not supported in this build. ` +
      'pdf-lib 1.17.1 does not implement PDF encryption. ' +
      'The Protect and Decrypt tools are unavailable.'
    );
    this.name = 'EncryptionNotSupportedError';
  }
}

/**
 * Stub: PDF encryption is not implemented.
 * @throws {EncryptionNotSupportedError} Always
 */
export async function protectPdf(
  _file: File,
  _userPassword: string,
  _ownerPassword: string,
  _permissions: PdfPermissions = {}
): Promise<Uint8Array> {
  throw new EncryptionNotSupportedError('PDF protection (encrypt)');
}

/**
 * Stub: PDF decryption is not implemented.
 * @throws {EncryptionNotSupportedError} Always
 */
export async function unlockPdf(_file: File, _password: string): Promise<Uint8Array> {
  throw new EncryptionNotSupportedError('PDF decryption (unlock)');
}
