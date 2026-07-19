# Image Re-encoding in CompressPdf — Design

**Date**: 2026-07-19
**Status**: Approved (verbal — user said "Write this up as a spec doc…")
**PR**: Next PR after the current feature-polish wave lands. Tracked in `TASK.md`.

## Problem

`compressPdf()` in `src/lib/compress.ts` only repacks PDF object streams and strips metadata. pdf-lib cannot re-encode embedded images, so real-world "compression" gains on image-heavy PDFs are 0–5%.

Users who pick "Compress PDF" expecting significant size reduction get a near-identical file. The UI is honest about this, but it leaves a gap the user actually wants filled.

## Goal

Add an opt-in **lossy image re-encoding** mode to the existing `CompressPdf` tool. Off by default → unchanged behavior. On → embedded JPEG/PNG images larger than a user-chosen threshold are downsampled to that threshold and re-encoded at a user-chosen JPEG quality.

## Non-Goals

- Re-encoding non-JPEG/PNG images (inline bitmaps, JPEG2000, JBIG2). Spec targets the common case.
- Preserving CMYK / spot colors. We assume DeviceRGB → JPEG is acceptable for screen PDFs.
- Bulk / per-folder processing. Single-file flow only.
- Removing the existing `CompressPdf` tool or replacing its copy. Behavior when the new toggle is off must be 100% identical.

## UX

In the configure step of `CompressPdf.tsx`, below the existing three compression-level buttons:

- New checkbox: **"Also re-compress embedded images (lossy)"** — default OFF.
- When checked, reveal two sliders:
  - **Max dimension**: 600–2000 px (default 1200). Images whose larger side exceeds this get downsampled.
  - **JPEG quality**: 0.4–0.95 (default 0.7).
- Tool description (in `ToolLayout description` prop) updated to: *"Re-pack PDF streams and optionally re-encodes large embedded images. Image re-encoding is lossy and irreversible."*
- The amber `role="note"` banner that already warns about image-compression limits is updated: when the toggle is on, add a second sentence *"Image re-encoding is irreversible: original pixels and any transparency or animation are lost."*

Result-state `notes[]` already exists; the new pipeline pushes entries like:

- `"Re-encoded 3 images larger than 1200px"`
- `"No embedded images larger than 1200px found — only stream repack applied"`
- `"Could not access image XObjects in this PDF (encrypted or malformed); only stream repack applied"` (fallback path)

## Architecture

Two libraries cooperate. **Boundary is enforced by `src/lib/compress-images.ts`**:

```
CompressPdf.tsx
  └── compressPdf(file, opts)            src/lib/compress.ts
        ├── stream-repack always         (existing)
        └── if opts.reencodeImages:
              compressImages(bytes, opts) src/lib/compress-images.ts (new)
                  ├── pdfjs getDocument + getOperatorList per page
                  ├── enumerate paintImageXObject / paintJpegXObject
                  ├── for each, check bitmap dimensions, re-encode if > maxDim
                  └── assemble modified PDF bytes with pdf-lib
```

`src/lib/compress.ts` API change:

```ts
export type CompressionLevel = 'low' | 'medium' | 'high';

export interface CompressionOpts {
  level: CompressionLevel;
  reencodeImages?: { maxDim: number; quality: number };
}

export interface CompressionResult {
  bytes: Uint8Array;
  notes: string[];
}

export async function compressPdf(
  file: File,
  opts: CompressionOpts,         // was: file, level
): Promise<CompressionResult>;
```

Backward compatibility: a second overload `compressPdf(file, level)` exists that maps to `opts = { level }` so any external callers (none today, but defensively) continue to compile.

The page (`CompressPdf.tsx`) state adds:

```ts
const [reencode, setReencode] = useState(false);
const [maxDim, setMaxDim] = useState(1200);
const [quality, setQuality] = useState(0.7);
```

`handleProcess` passes `{ level, reencodeImages: reencode ? { maxDim, quality } : undefined }`. Result handling unchanged.

`CompressPdf.test.tsx`: existing assertions stay. One new test: when `reencode` is true and a PDF with embedded images is uploaded, the resulting `notes[]` includes a "Re-encoded N images" line. Image processing is mocked at the `compress-images.ts` boundary.

## Image enumeration & swap pipeline

Pseudocode for `compress-images.ts`:

```ts
import { PDFDocument } from 'pdf-lib';
import { pdfjsLib } from './pdfjs';

export async function compressImages(
  pdfBytes: Uint8Array,
  opts: { maxDim: number; quality: number },
): Promise<{ bytes: Uint8Array; notes: string[] }> {
  const notes: string[] = [];

  // Load the source into pdf-lib so we can modify it.
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  // pdfjs needs the bytes too — copy is unavoidable since pdfjs transfers ArrayBuffer.
  const pdfjsBytes = pdfBytes.slice();
  const pdfjsDoc = await pdfjsLib.getDocument({ data: pdfjsBytes }).promise;

  let reencoded = 0;
  const totalPages = pdfjsDoc.numPages;

  for (let p = 1; p <= totalPages; p++) {
    const page = await pdfjsDoc.getPage(p);
    const opList = await page.getOperatorList();
    const opListData = page.objs; // Map<name, Bitmap|Dict>

    // Find every paintImageXObject / paintJpegXObject op.
    const imageNames = new Set<string>();
    for (let i = 0; i < opList.fnArray.length; i++) {
      const op = opList.fnArray[i];
      // OPS.paintImageXObject / OPS.paintJpegXObject constants.
      // We compare against raw numbers to avoid pulling pdfjs OPS enum into our types.
      if (op === OPS_PAINT_IMAGE_XOBJECT || op === OPS_PAINT_JPEG_XOBJECT) {
        imageNames.add(opList.argsArray[i][0]);
      }
    }

    for (const imageName of imageNames) {
      const obj = opListData.get(imageName);
      if (!obj || !obj.width || !obj.height) continue;
      if (Math.max(obj.width, obj.height) <= opts.maxDim) continue;

      // Render the bitmap into canvas at the target maxDim.
      const scale = opts.maxDim / Math.max(obj.width, obj.height);
      const w = Math.round(obj.width * scale);
      const h = Math.round(obj.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.drawImage(obj, 0, 0, w, h);
      const blob = await new Promise<Blob | null>(r =>
        canvas.toBlob(r, 'image/jpeg', opts.quality),
      );
      if (!blob) continue;

      const newBytes = new Uint8Array(await blob.arrayBuffer());

      // Replace the existing XObject stream in pdf-lib.
      const stream = doc.context.lookup(doc.context.get(p).get('Resources')
        .get('XObject').get(imageName)) as PDFStream;
      // ... pdf-lib low-level reassignment. Exact mechanics TBD during impl.
      // If the swap fails for any reason, fall through to stream-only and append a note.

      reencoded++;
    }
  }

  notes.push(
    reencoded > 0
      ? `Re-encoded ${reencoded} images larger than ${opts.maxDim}px`
      : `No embedded images larger than ${opts.maxDim}px found — only stream repack applied`,
  );

  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, notes };
}
```

The `OPS_PAINT_*` constants are looked up at module load by walking `pdfjsLib.OPS` once, with a hardcoded fallback (they have been stable across pdfjs 4.x — values are 73 / 79 historically and may be re-verified during impl).

If pdf-lib's low-level XObject swap proves flaky, fallback path (per page, not whole doc): render the page to JPEG via pdfjs and add as overlay — but this drops the text layer. Spec uses only the in-place swap path; we do **not** implement the fallback in v1. If the swap fails for a particular XObject, we skip it and append a note: `"Skipped N images that could not be re-encoded in place"`.

## Error handling

- pdfjs throws on malformed PDFs → caught, notes get `"PDF could not be parsed for image re-encoding: <message>"`, stream-repack result is returned instead.
- Encrypted PDFs: pdfjs refuses. Caught same as above. `compressPdf` already calls `PDFDocument.load` with `ignoreEncryption: true` for the stream path, but image ops require the actual decrypted structure. Fallback: stream-repack only.
- Image re-encode that produces a larger blob (rare, e.g. small high-color images) → still swapped. We don't try to be clever; size monotonicity is documented but not guaranteed.
- Canvas `toBlob` returns null (extremely rare on modern browsers) → skip that image, append note.

## Testing

`src/lib/compress-images.test.ts` (~6 tests):

1. **Pass-through when no images over threshold**: synthesize a PDF with one 200×200 embedded JPEG, call with `maxDim: 1200`, expect result bytes equal to input (modulo any header timestamp), `notes` contains the "no images" line.
2. **Downsample reduces size**: synthesize PDF with one 2400×1800 JPEG, call with `maxDim: 1200 quality: 0.7`, expect result < input, `notes` contains "Re-encoded 1 images larger than 1200px".
3. **Quality affects output size**: same 2400×1800 JPEG input, `quality: 0.5` output bytes < `quality: 0.9` output bytes. Use `expect(...).lessThan(...)`; if the test ever fails because quality is non-monotonic in some edge case, the fix is not to weaken the assertion but to use a bigger more-photo-like JPEG fixture.
4. **Respects threshold**: same large image, `maxDim: 3000` → no swap, no `Re-encoded` note.
5. **Multi-page aggregation**: 3-page PDF, 2 of 3 pages have a big image, expect `Re-encoded 2 images`.
6. **Malformed PDF falls back gracefully**: pass random bytes, expect no throw, notes contain a "could not be parsed" line, result is non-empty (could be stream-repack of the random bytes as text-ish).

`src/lib/compress.test.ts` additions (~2 tests):

7. `compressPdf(file, { level, reencodeImages: undefined })` matches old behavior — emit same `bytes` as before for the same input.
8. `compressPdf` with `reencodeImages` notes gets a "Re-encoded ..." line prepended.

`src/pages/tools/CompressPdf.test.tsx` additions (~2 tests):

9. Checkbox toggle reveals the two sliders; sliders are not in DOM when checkbox is unchecked (covered today by tests that already assert; extend to assert opposite).
10. Result page shows the new notes when the toggle was on.

PDF fixtures: synthesized in-test using pdf-lib (a 2400×1800 JPEG byte buffer can be a tiny in-test canvas blob). No binary fixture files committed.

## Honest copy

Description on `ToolLayout` (from PR 6):

- Before: *"Re-pack PDF streams to reduce file size. pdf-lib cannot re-compress embedded images, so size reduction is limited."*
- After: *"Re-pack PDF streams and optionally re-encodes large embedded images. Image re-encoding is lossy and irreversible."*

The amber banner in the configure step gets a conditional extra sentence when the toggle is on.

`src/constants/tools.ts` is updated so the home-page card description matches: *"Re-pack PDF streams, optionally re-encode large embedded images."*

## Files Touched

- `src/lib/compress.ts` — opts-based API + overload.
- `src/lib/compress-images.ts` (new) — pipeline.
- `src/lib/compress-images.test.ts` (new) — 6 tests.
- `src/lib/compress.test.ts` — 2 new tests.
- `src/pages/tools/CompressPdf.tsx` — state + UI.
- `src/pages/tools/CompressPdf.test.tsx` — 2 new tests.
- `src/constants/tools.ts` — home-page copy.

Total: 6 files (2 new).

## Verification

- `npm run typecheck` → 0 errors
- `npm test` → all pass
- `npm run build` → succeeds

## Open Questions for Implementation

- The exact pdf-lib API for swapping an existing XObject stream needs confirmation. The likely path is `pdfDoc.context.lookup(pdfLibRef)` then `PDFStream.of(...)`. If this turns out unreliable, scope is the same but the implementation note in code gets a `# ponytail: pdf-lib private API, replace with public alternative if it becomes available`.
- pdfjs internal `page.objs` Map access. If pdfjs 5.x changes the shape, the wrapper function isolates the change. Spec stays the same.
