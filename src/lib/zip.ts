/**
 * In-memory ZIP archives built with the already-installed jszip.
 *
 * jszip is imported dynamically: it is only needed by tools that produce
 * several files at once (split, batch, image extraction), so it must stay out
 * of the initial bundle budget.
 */

export interface ZipEntry {
  /** Path of the file inside the archive. A plain file name keeps the archive flat. */
  name: string;
  data: Uint8Array | Blob | string;
}

/**
 * Build a ZIP archive from file entries that are already in memory.
 *
 * @param entries Files to add. Names must be non-empty and unique.
 * @returns A Blob of type `application/zip` suitable for a download URL.
 * @throws {Error} If there are no entries, an entry has a blank name, or two
 *         entries share the same name.
 */
export async function buildZipFile(entries: ZipEntry[]): Promise<Blob> {
  if (entries.length === 0) {
    throw new Error('Cannot build a ZIP archive with no files.');
  }

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const entry of entries) {
    const name = entry.name.trim();
    if (name.length === 0) {
      throw new Error('Every ZIP entry needs a file name.');
    }
    if (usedNames.has(name)) {
      throw new Error(`Duplicate ZIP entry "${name}".`);
    }
    usedNames.add(name);
    zip.file(name, entry.data);
  }

  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}
