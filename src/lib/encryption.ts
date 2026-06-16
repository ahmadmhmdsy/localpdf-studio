import { PDFDocument, LoadOptions, SaveOptions } from 'pdf-lib';

export interface PdfPermissions {
  printing?: boolean;
  modifying?: boolean;
  copying?: boolean;
  annotating?: boolean;
}

interface UnlockOptions extends LoadOptions {
  password?: string;
}

interface EncryptOptions extends SaveOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: PdfPermissions;
}

export async function unlockPdf(file: File, password: string): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer, { password } as UnlockOptions);
  return await pdf.save();
}

export async function protectPdf(
  file: File,
  userPassword: string,
  ownerPassword: string,
  permissions: PdfPermissions = {}
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  return await pdf.save({ userPassword, ownerPassword, permissions } as EncryptOptions);
}
