import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildZipFile } from './zip';

const ZIP_MIME_TYPE = 'application/zip';

async function openArchive(blob: Blob): Promise<JSZip> {
  return JSZip.loadAsync(new Uint8Array(await blob.arrayBuffer()));
}

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

describe('buildZipFile', () => {
  it('packages every entry under its own name', async () => {
    const first = bytes(1, 2, 3);
    const second = bytes(9, 8, 7);

    const blob = await buildZipFile([
      { name: 'split_document_1-2.pdf', data: first },
      { name: 'split_document_3.pdf', data: second },
    ]);

    expect(blob.type).toBe(ZIP_MIME_TYPE);
    const zip = await openArchive(blob);
    expect(Object.keys(zip.files).sort()).toEqual(['split_document_1-2.pdf', 'split_document_3.pdf']);
    expect(await zip.file('split_document_1-2.pdf')?.async('uint8array')).toEqual(first);
    expect(await zip.file('split_document_3.pdf')?.async('uint8array')).toEqual(second);
  });

  it('accepts text, Blob and Uint8Array entries', async () => {
    const blob = await buildZipFile([
      { name: 'notes.txt', data: 'hello archive' },
      { name: 'image.bin', data: new Blob([bytes(4, 5, 6)]) },
      { name: 'document.pdf', data: bytes(7, 8, 9) },
    ]);

    const zip = await openArchive(blob);
    expect(await zip.file('notes.txt')?.async('string')).toBe('hello archive');
    expect(await zip.file('image.bin')?.async('uint8array')).toEqual(bytes(4, 5, 6));
    expect(await zip.file('document.pdf')?.async('uint8array')).toEqual(bytes(7, 8, 9));
  });

  it('keeps directory-style entry names as archive paths', async () => {
    const blob = await buildZipFile([{ name: 'pages/page_1.pdf', data: bytes(1) }]);

    const zip = await openArchive(blob);
    expect(zip.file('pages/page_1.pdf')).not.toBeNull();
  });

  it('rejects an empty entry list', async () => {
    await expect(buildZipFile([])).rejects.toThrow(/no files/i);
  });

  it('rejects a blank entry name', async () => {
    await expect(buildZipFile([{ name: '   ', data: bytes(1) }])).rejects.toThrow(/file name/i);
  });

  it('rejects duplicate entry names', async () => {
    await expect(
      buildZipFile([
        { name: 'split_document_1.pdf', data: bytes(1) },
        { name: 'split_document_1.pdf', data: bytes(2) },
      ]),
    ).rejects.toThrow(/duplicate/i);
  });
});
