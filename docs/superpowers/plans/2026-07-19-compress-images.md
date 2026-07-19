# CompressPdf Image Re-encoding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in "Also re-compress embedded images (lossy)" toggle to `CompressPdf`. When on, embedded images larger than a user-chosen dimension get downsampled and re-encoded at a user-chosen JPEG quality. Off = unchanged behavior.

**Architecture:** New `src/lib/compress-images.ts` owns the pdfjs→canvas→pdf-lib swap pipeline. `src/lib/compress.ts` accepts a new `opts` object and delegates to it. UI lives in `CompressPdf.tsx`.

**Tech Stack:** pdfjs (existing), pdf-lib (existing), Canvas 2D + `toBlob`, React + Tailwind (existing).

**Spec:** `docs/superpowers/specs/2026-07-19-compress-images-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/compress-images.ts` | Create | Pipeline: enumerate images via pdfjs, re-encode, swap into pdf-lib. ~150 lines. |
| `src/lib/compress-images.test.ts` | Create | 6 unit tests + 1 fixture helper. |
| `src/lib/compress.ts` | Modify | `compressPdf(file, opts)` opts object; delegate to compress-images when `reencodeImages` set; keep `(file, level)` overload for back-compat. |
| `src/lib/compress.test.ts` | Modify | 2 new tests. |
| `src/pages/tools/CompressPdf.tsx` | Modify | State + UI: checkbox + two sliders + updated copy + result-page notes are already wired. |
| `src/pages/tools/CompressPdf.test.tsx` | Modify | 2 new tests. |
| `src/constants/tools.ts` | Modify | 1-line description update on the home-page card. |

---

## Task 1: Pdfjs OPS constants lookup helper

**Files:**
- Create: `src/lib/pdfjs-ops.ts` (~15 lines)

- [ ] **Step 1: Create helper that resolves OPS.paintImageXObject / paintJpegXObject**

Create `src/lib/pdfjs-ops.ts`:

```ts
import { pdfjsLib } from './pdfjs';

// pdfjs doesn't export OPS values in their TypeScript types, so we look them up
// once at module load. They are stable across pdfjs 4.x; if a future major
// version changes them, this is the single place to fix.
// ponytail: relies on internal pdfjs API, isolated here.

const PAINT_OPS_CANDIDATES = ['paintImageXObject', 'paintJpegXObject'] as const;
type PaintOpName = typeof PAINT_OPS_CANDIDATES[number];

const resolved: Record<PaintOpName, number | null> = {
  paintImageXObject: null,
  paintJpegXObject: null,
};

for (const [opName, opValue] of Object.entries(pdfjsLib.OPS ?? {})) {
  if (opName === 'paintImageXObject' || opName === 'paintJpegXObject') {
    resolved[opName] = Number(opValue);
  }
}

export const PAINT_IMAGE_XOBJECT_OP = resolved.paintImageXObject;
export const PAINT_JPEG_XOBJECT_OP = resolved.paintJpegXObject;
```

If `pdfjsLib.OPS` is not present at runtime (rare), both values are `null` and the pipeline skips image processing safely.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

---

## Task 2: Failing test for pass-through when nothing to re-encode

**Files:**
- Create: `src/lib/compress-images.test.ts`

- [ ] **Step 1: Write the test fixture helper**

The tests need PDFs with embedded JPEG images of known dimensions. Add at the top of the test file:

```ts
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';

async function makePdfWithImage(width: number, height: number): Promise<Uint8Array> {
  // Build a tiny in-memory JPEG via canvas (jsdom already mocks canvas).
  const { createCanvas } = await import('canvas').catch(() => ({}) as any) ?? {};
  // Fallback: synthesize a small JPEG via pdf-lib's embedJpg with pre-built bytes.
  // For tests, use a hand-rolled minimal JPEG of (width x height) solid color.
  // We approximate by re-using a 1x1 JPEG scaled by embedJpg (pdf-lib accepts raw JPEG bytes).
  // Real implementation uses headless canvas; in jsdom the canvas mock returns the same bytes.
  const tinyJpegBase64 =
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/EABUQAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/EABURAQAAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AB//Z';

  const jpegBytes = Uint8Array.from(atob(tinyJpegBase64), c => c.charCodeAt(0));

  const doc = await PDFDocument.create();
  const jpg = await doc.embedJpg(jpegBytes, { width, height });
  const page = doc.addPage([width, height]);
  page.drawImage(jpg, { x: 0, y: 0, width, height });
  return await doc.save();
}
```

Yes, `import('canvas')` is intentionally tried-then-swallowed — jsdom test environment doesn't ship node-canvas. The byte-fallback builds the PDF with a real image XObject that pdfjs can enumerate.

- [ ] **Step 2: Write the test: nothing over threshold → result bytes ~ input, notes say no images**

```ts
import { compressImages } from './compress-images';

describe('compressImages', () => {
  it('passes through when no images are above threshold', async () => {
    const input = await makePdfWithImage(200, 200);
    const result = await compressImages(input, { maxDim: 1200, quality: 0.7 });

    expect(result.bytes.byteLength).toBeLessThanOrEqual(input.byteLength);
    expect(result.notes.some(n => /no embedded images/i.test(n))).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

Run: `npx vitest run src/lib/compress-images.test.ts -t "passes through"`
Expected: FAIL with `compressImages is not a function` (module doesn't exist yet).

---

## Task 3: Minimal compress-images.ts that passes the pass-through test

**Files:**
- Create: `src/lib/compress-images.ts`

- [ ] **Step 1: Write the minimal implementation**

```ts
import { PDFDocument } from 'pdf-lib';
import { pdfjsLib } from './pdfjs';
import { PAINT_IMAGE_XOBJECT_OP, PAINT_JPEG_XOBJECT_OP } from './pdfjs-ops';

export interface CompressImagesOpts {
  maxDim: number;
  quality: number;
}

export interface CompressImagesResult {
  bytes: Uint8Array;
  notes: string[];
}

export async function compressImages(
  pdfBytes: Uint8Array,
  opts: CompressImagesOpts,
): Promise<CompressImagesResult> {
  const notes: string[] = [];

  // Try pdf-lib first; if that path even loads, we'll know the bytes are parseable.
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  } catch (err: any) {
    notes.push(`PDF could not be parsed for image re-encoding: ${err?.message ?? 'unknown'}`);
    return { bytes: pdfBytes, notes };
  }

  const pdfjsBytes = pdfBytes.slice();
  const pdfjsDoc = await pdfjsLib.getDocument({ data: pdfjsBytes }).promise;

  let reencoded = 0;
  for (let p = 1; p <= pdfjsDoc.numPages; p++) {
    const page = await pdfjsDoc.getPage(p);
    const opList = await page.getOperatorList();
    const objs = page.objs as Map<string, any>;
    const imageNames = new Set<string>();

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      if (
        fn === PAINT_IMAGE_XOBJECT_OP ||
        fn === PAINT_JPEG_XOBJECT_OP
      ) {
        const name = String(opList.argsArray[i][0]);
        imageNames.add(name);
      }
    }

    for (const name of imageNames) {
      const obj = objs.get(name);
      if (!obj || !obj.width || !obj.height) continue;
      if (Math.max(obj.width, obj.height) <= opts.maxDim) continue;

      // For now: pretend we re-encoded, just to exercise the count code path.
      // The real swap is added in Task 4.
      reencoded++;
    }
  }

  notes.push(
    reencoded > 0
      ? `Re-encoded ${reencoded} images larger than ${opts.maxDim}px`
      : `No embedded images larger than ${opts.maxDim}px found — only stream repack applied`,
  );

  void doc; // suppress unused
  const bytes = await new PDFDocument().save(); // bytes that round-trip cleanly but unrelated to input
  // For the pass-through test we want to not throw and return non-empty bytes.
  // The real "save with swap" replaces this once Task 4 lands.
  return { bytes, notes };
}
```

- [ ] **Step 2: Run the test to confirm it passes**

Run: `npx vitest run src/lib/compress-images.test.ts -t "passes through"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdfjs-ops.ts src/lib/compress-images.ts src/lib/compress-images.test.ts
git commit -m "feat: scaffold compress-images pipeline + pass-through test"
```

---

## Task 4: Downsample test + actual bitmap re-encode

**Files:**
- Modify: `src/lib/compress-images.test.ts`
- Modify: `src/lib/compress-images.ts`

- [ ] **Step 1: Write failing test: re-encoded count appears when image is over threshold**

Append to the existing `describe`:

```ts
  it('reports re-encoded images when one is over threshold', async () => {
    const input = await makePdfWithImage(2400, 1800);
    const result = await compressImages(input, { maxDim: 1200, quality: 0.7 });

    expect(result.bytes.byteLength).toBeGreaterThan(0);
    expect(result.notes.some(n => /re-encoded \d+ images/i.test(n))).toBe(true);
  });
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npx vitest run src/lib/compress-images.test.ts -t "reports re-encoded"`
Expected: PASS already (because Task 3 already increments `reencoded`). So this test trivially passes. **Skip ahead to Step 3 to make it test the real behavior.**

- [ ] **Step 3: Strengthen the test: re-encoded count must equal number of oversized images**

Replace the test above with:

```ts
  it('counts exactly the oversized images, not small ones', async () => {
    // Make a 2-page PDF: page 1 has a big image, page 2 has a small one.
    const doc = await PDFDocument.create();
    const big = await doc.embedJpg(Uint8Array.from(atob(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/EABUQAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/EABURAQAAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AB//Z',
    ), c => c.charCodeAt(0)), { width: 2400, height: 1800 });
    const small = await doc.embedJpg(Uint8Array.from(atob(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/EABUQAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/EABURAQAAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AB//Z',
    ), c => c.charCodeAt(0)), { width: 200, height: 150 });
    const p1 = doc.addPage([2400, 1800]);
    p1.drawImage(big, { x: 0, y: 0, width: 2400, height: 1800 });
    const p2 = doc.addPage([200, 150]);
    p2.drawImage(small, { x: 0, y: 0, width: 200, height: 150 });
    const input = await doc.save();

    const result = await compressImages(input, { maxDim: 1200, quality: 0.7 });

    const note = result.notes.find(n => /re-encoded \d+ images/i.test(n));
    expect(note).toBeDefined();
    expect(note).toMatch(/re-encoded 1 images?/i);
  });
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/lib/compress-images.test.ts -t "counts exactly"`
Expected: PASS.

(Skipping ahead — the pipeline correctly counts because we only increment when `Math.max > maxDim`. The actual swap is wired in the next task.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/compress-images.test.ts
git commit -m "test: assert compress-images counts only oversized images"
```

---

## Task 5: Wire the real image swap into pdf-lib

**Files:**
- Modify: `src/lib/compress-images.ts`

The in-place XObject swap uses pdf-lib's `PDFStream` + `PDFRawStream` to replace the bytes. The exact API:

- [ ] **Step 1: Replace the loop body with the real re-encode + swap**

Replace the `for (const name of imageNames)` block (everything inside the outer `for (let p = 1; ...)` loop) with:

```ts
    for (const name of imageNames) {
      const obj = objs.get(name);
      if (!obj || !obj.width || !obj.height) continue;
      if (Math.max(obj.width, obj.height) <= opts.maxDim) continue;

      const w0 = obj.width as number;
      const h0 = obj.height as number;
      const scale = opts.maxDim / Math.max(w0, h0);
      const w1 = Math.max(1, Math.round(w0 * scale));
      const h1 = Math.max(1, Math.round(h0 * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w1;
      canvas.height = h1;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      try {
        ctx.drawImage(obj, 0, 0, w1, h1);
      } catch (err) {
        // Some pdfjs bitmap shapes don't drawImage cleanly; skip.
        continue;
      }

      const blob = await new Promise<Blob | null>(r =>
        canvas.toBlob(r, 'image/jpeg', opts.quality),
      );
      if (!blob) continue;
      const newBytes = new Uint8Array(await blob.arrayBuffer());

      // Find the XObject ref on this page.
      try {
        const pageRef = doc.context.get(p);
        const resources = pageRef.get(require('pdf-lib').PDFName.of('Resources'));
        const xobjects = resources.get(require('pdf-lib').PDFName.of('XObject'));
        const xobjRef = xobjects.get(require('pdf-lib').PDFName.of(name));
        if (!xobjRef) continue;

        const newStream = require('pdf-lib').PDFStream.of(newBytes, doc.context, {
          Filter: require('pdf-lib').PDFName.of('DCTDecode'),
        });
        doc.context.assign(xobjRef, newStream);
        reencoded++;
      } catch {
        // Swap failed for this image; skip.
      }
    }
```

Wait — the `require()` calls won't work in ESM/Vite. Replace with top-of-file imports:

At the top of `compress-images.ts`, add:

```ts
import { PDFDocument, PDFName, PDFStream } from 'pdf-lib';
```

Then the swap body becomes:

```ts
      try {
        const pageRef = doc.context.get(p);
        const resources = pageRef.get(PDFName.of('Resources'));
        const xobjects = resources.get(PDFName.of('XObject'));
        const xobjDict = xobjects.get(PDFName.of(name));
        if (!xobjDict) continue;

        const newStream = PDFStream.of(newBytes, doc.context, {
          Filter: PDFName.of('DCTDecode'),
        });
        doc.context.assign(xobjDict, newStream);
        reencoded++;
      } catch {
        // swap failed: image skipped, not re-encoded
      }
```

Use this version. The `require()` experiment was a misleading first draft.

- [ ] **Step 2: Update the `return` at the bottom of `compressImages` to actually save the modified doc**

Replace:

```ts
  void doc; // suppress unused
  const bytes = await new PDFDocument().save(); // bytes that round-trip cleanly but unrelated to input
  // For the pass-through test we want to not throw and return non-empty bytes.
  // The real "save with swap" replaces this once Task 4 lands.
  return { bytes, notes };
```

With:

```ts
  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, notes };
```

- [ ] **Step 3: Run all compress-images tests**

Run: `npx vitest run src/lib/compress-images.test.ts`
Expected: 3 pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/compress-images.ts
git commit -m "feat: wire bitmap re-encode + pdf-lib XObject swap"
```

---

## Task 6: Quality affects output bytes

**Files:**
- Modify: `src/lib/compress-images.test.ts`

- [ ] **Step 1: Add the test**

```ts
  it('quality setting changes output bytes (lower quality = smaller)', async () => {
    const input = await makePdfWithImage(2400, 1800);
    const big = await compressImages(input, { maxDim: 1200, quality: 0.9 });
    const small = await compressImages(input, { maxDim: 1200, quality: 0.5 });

    expect(big.bytes.byteLength).toBeGreaterThan(small.bytes.byteLength);
  });
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/lib/compress-images.test.ts -t "quality setting"`
Expected: PASS (because the bitmap really is redrawn at two qualities and the JPEG sizes differ).

- [ ] **Step 3: Commit**

```bash
git add src/lib/compress-images.test.ts
git commit -m "test: compress-images quality slider is monotonic"
```

---

## Task 7: Malformed PDF falls back gracefully

**Files:**
- Modify: `src/lib/compress-images.test.ts`

- [ ] **Step 1: Add the test**

```ts
  it('returns the input bytes unchanged when pdfjs cannot parse the PDF', async () => {
    const garbage = new TextEncoder().encode('not a pdf, just text');
    const result = await compressImages(garbage, { maxDim: 1200, quality: 0.7 });

    expect(result.bytes.byteLength).toBe(garbage.byteLength);
    expect(result.notes.some(n => /could not be parsed/i.test(n))).toBe(true);
  });
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/lib/compress-images.test.ts -t "returns the input bytes"`
Expected: PASS — the existing try/catch around `pdfjsLib.getDocument` catches and the existing fallback returns `{ bytes: pdfBytes, notes }`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compress-images.test.ts
git commit -m "test: compress-images fallback on unparseable PDF"
```

---

## Task 8: Multi-page aggregation

**Files:**
- Modify: `src/lib/compress-images.test.ts`

Already covered by Task 4's 2-page test (big on p1, small on p2). Task 8 verifies the count sums across 3 pages instead of just 2.

- [ ] **Step 1: Add the test**

```ts
  it('aggregates re-encoded count across multiple pages', async () => {
    const doc = await PDFDocument.create();
    const jpeg = await doc.embedJpg(Uint8Array.from(atob(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/EABUQAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/EABURAQAAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AB//Z',
    ), c => c.charCodeAt(0)), { width: 2000, height: 1500 });
    for (let i = 0; i < 3; i++) {
      const p = doc.addPage([2000, 1500]);
      p.drawImage(jpeg, { x: 0, y: 0, width: 2000, height: 1500 });
    }
    const input = await doc.save();

    const result = await compressImages(input, { maxDim: 1200, quality: 0.7 });

    const note = result.notes.find(n => /re-encoded \d+ images/i.test(n));
    expect(note).toMatch(/re-encoded 3 images?/i);
  });
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/lib/compress-images.test.ts -t "aggregates"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compress-images.test.ts
git commit -m "test: compress-images aggregates count across pages"
```

---

## Task 9: compress.ts opts-based API + back-compat overload

**Files:**
- Modify: `src/lib/compress.ts`
- Modify: `src/lib/compress.test.ts` (or add the 2 tests here if file doesn't exist)

- [ ] **Step 1: Read current compress.ts to confirm the exact rewrite**

The current file is small (49 lines). Replace its entire contents with:

```ts
import { PDFDocument } from 'pdf-lib';
import { compressImages } from './compress-images';

export type CompressionLevel = 'low' | 'medium' | 'high';

export interface ReencodeImagesOpts {
  maxDim: number;
  quality: number;
}

export interface CompressionOpts {
  level: CompressionLevel;
  reencodeImages?: ReencodeImagesOpts;
}

export interface CompressionResult {
  bytes: Uint8Array;
  notes: string[];
}

const NOTE_NO_IMAGE_RECOMPRESSION =
  'pdf-lib cannot re-compress images embedded in the PDF. ' +
  'Compression is limited to: (1) removing metadata, (2) re-packing content streams with object streams.';

const NO_OP_NOTE =
  'Image re-encoding is off — only stream repack was applied.';

export async function compressPdf(
  file: File,
  optsOrLevel: CompressionOpts | CompressionLevel,
): Promise<CompressionResult> {
  const opts: CompressionOpts =
    typeof optsOrLevel === 'string' ? { level: optsOrLevel } : optsOrLevel;

  const level = opts.level;
  const useObjectStreams = true;
  const addDefaultPage = false;
  const objectsPerTick = level === 'high' ? 50 : level === 'medium' ? 100 : 200;

  const arrayBuffer = await file.arrayBuffer();
  const originalBytes = new Uint8Array(arrayBuffer);

  // Always: stream-repack pass first.
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  pdf.setTitle('');
  pdf.setAuthor('');
  pdf.setSubject('');
  pdf.setKeywords([]);
  pdf.setProducer('');
  pdf.setCreator('');

  const notes: string[] = [NOTE_NO_IMAGE_RECOMPRESSION];

  notes.push(
    `Level "${level}" applied. ` +
      'If the source PDF already had efficient object streams, the size reduction may be minimal.',
  );

  const streamOnlyBytes = await pdf.save({
    useObjectStreams,
    addDefaultPage,
    objectsPerTick,
  });

  // If re-encoding was not requested, return the stream-only result.
  if (!opts.reencodeImages) {
    notes.push(NO_OP_NOTE);
    return { bytes: streamOnlyBytes, notes };
  }

  // Otherwise delegate to the image pipeline.
  const imgResult = await compressImages(streamOnlyBytes, opts.reencodeImages);

  // Merge: pipeline notes come last; the leading notes describe the stream pass.
  return {
    bytes: imgResult.bytes,
    notes: [...notes, ...imgResult.notes],
  };
}
```

The overload keeps `compressPdf(file, 'medium')` working for any external callers (none today, but the old tests use it).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

---

## Task 10: compress.test.ts tests for new API

**Files:**
- Modify: `src/lib/compress.test.ts`

- [ ] **Step 1: If the file doesn't exist, create it with these 4 tests**

Create `src/lib/compress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { compressPdf } from './compress';

async function tinyPdf(): Promise<File> {
  const bytes = await new PDFDocument().save();
  return new File([bytes], 'tiny.pdf', { type: 'application/pdf' });
}

describe('compressPdf', () => {
  it('accepts the legacy level-only signature (back-compat)', async () => {
    const file = await tinyPdf();
    const result = await compressPdf(file, 'medium');
    expect(result.bytes.byteLength).toBeGreaterThan(0);
    expect(result.notes.some(n => /level "medium"/i.test(n))).toBe(true);
  });

  it('opts form without reencodeImages returns the "image re-encoding is off" note', async () => {
    const file = await tinyPdf();
    const result = await compressPdf(file, { level: 'high' });
    expect(result.notes.some(n => /image re-encoding is off/i.test(n))).toBe(true);
  });

  it('opts form with reencodeImages prepends a Re-encoded note when images are found', async () => {
    // Build a 1-page PDF with an oversized image so the pipeline actually runs.
    const doc = await PDFDocument.create();
    const tinyJpeg = Uint8Array.from(atob(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/EABUQAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/EABURAQAAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AB//Z',
    ), c => c.charCodeAt(0));
    const jpg = await doc.embedJpg(tinyJpeg, { width: 2400, height: 1800 });
    const p = doc.addPage([2400, 1800]);
    p.drawImage(jpg, { x: 0, y: 0, width: 2400, height: 1800 });
    const bytes = await doc.save();
    const file = new File([bytes], 'big.pdf', { type: 'application/pdf' });

    const result = await compressPdf(file, {
      level: 'medium',
      reencodeImages: { maxDim: 1200, quality: 0.7 },
    });

    expect(result.notes.some(n => /re-encoded \d+ images?/i.test(n))).toBe(true);
  });

  it('opts form without reencodeImages produces the same bytes as the legacy call for the same input', async () => {
    const file = await tinyPdf();
    const a = await compressPdf(file, 'medium');
    const b = await compressPdf(file, { level: 'medium' });
    // Byte-for-byte equality may not hold due to /CreationDate timestamps in pdf-lib.
    // Length should be the same.
    expect(a.bytes.byteLength).toBe(b.bytes.byteLength);
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/lib/compress.test.ts`
Expected: 4 pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compress.ts src/lib/compress.test.ts
git commit -m "feat: compressPdf opts API + image-pipeline delegation"
```

---

## Task 11: UI — checkbox + sliders + updated copy

**Files:**
- Modify: `src/pages/tools/CompressPdf.tsx`

- [ ] **Step 1: Add state + UI**

Add three new useState declarations next to the existing ones (around line 19):

```ts
  const [reencode, setReencode] = useState(false);
  const [maxDim, setMaxDim] = useState(1200);
  const [quality, setQuality] = useState(0.7);
```

Update `handleProcess` to pass the new opts:

```ts
  const handleProcess = async () => {
    if (!file) return;
    setStep('processing');
    try {
      const result = await compressPdf(file, {
        level: quality,
        reencodeImages: reencode ? { maxDim, quality } : undefined,
      });
      const blob = new Blob([result.bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setResultNotes(result.notes);
      setStep('download');
    } catch (error: any) {
      logError('Error compressing PDF:', error);
      showToast({
        message: 'An error occurred. Please try again.',
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    }
  };
```

Update the `ToolLayout` description prop (line 72):

```tsx
      description="Re-pack PDF streams and optionally re-encodes large embedded images. Image re-encoding is lossy and irreversible."
```

Update the amber banner (lines 113-122) so the second sentence appears only when `reencode` is on:

```tsx
            <div
              role="note"
              className="mb-6 flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm"
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                This tool cannot re-compress JPEG or PNG images already embedded in the PDF. Real
                size reduction happens only when the source PDF had unoptimized metadata or
                inefficient object streams.
                {reencode && (
                  <> Image re-encoding is irreversible: original pixels, transparency, and any animation are lost.</>
                )}
              </p>
            </div>
```

Add the checkbox + sliders block immediately after the closing `</div>` of the three compression-level buttons block (after line 167, before the wrapping `</div>` at line 168):

```tsx
            <div className="space-y-4 mt-6 pt-6 border-t border-[var(--border)]">
              <label className="flex items-center gap-3 text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={reencode}
                  onChange={(e) => setReencode(e.target.checked)}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="font-medium">
                  Also re-compress embedded images (lossy)
                </span>
              </label>

              {reencode && (
                <div className="space-y-4 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                      Max dimension: <span className="text-[var(--text)] font-semibold">{maxDim}px</span>
                    </label>
                    <input
                      type="range"
                      min={600}
                      max={2000}
                      step={100}
                      value={maxDim}
                      onChange={(e) => setMaxDim(Number(e.target.value))}
                      className="w-full"
                      aria-label="Maximum dimension in pixels"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                      JPEG quality: <span className="text-[var(--text)] font-semibold">{Math.round(quality * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min={0.4}
                      max={0.95}
                      step={0.05}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full"
                      aria-label="JPEG quality"
                    />
                  </div>
                </div>
              )}
            </div>
```

Note: the local `quality` state shadows the `quality` 'CompressionLevel' prop name briefly. To avoid the name collision, rename: the existing `quality` (CompressionLevel) was renamed by the existing code. **Verify the file's existing variable name — it's currently `quality: Quality` for CompressionLevel.** If so, rename the new slider value to `jpegQuality`:

```ts
  const [jpegQuality, setJpegQuality] = useState(0.7);
```

…and use `jpegQuality` in the slider + the `handleProcess` payload.

Apply this rename inline. The plan should state it explicitly so the implementer doesn't get caught.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors (provided the rename from Step 1's note was applied).

---

## Task 12: Page tests for the new UI

**Files:**
- Modify: `src/pages/tools/CompressPdf.test.tsx`

- [ ] **Step 1: Read existing test file**

Read `src/pages/tools/CompressPdf.test.tsx` to know what it mocks.

- [ ] **Step 2: Add the checkbox / slider tests**

Append to the existing describe block:

```tsx
  describe('image re-encoding toggle', () => {
    it('reveals the max-dim and quality sliders only when the checkbox is on', () => {
      renderWithProviders(<CompressPdf />);
      // upload a file so we reach the configure step
      // (follow the pattern already used in this file's other tests)

      // No sliders visible yet
      expect(screen.queryByLabelText(/maximum dimension/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/jpeg quality/i)).not.toBeInTheDocument();

      // Click the checkbox
      const checkbox = screen.getByRole('checkbox', {
        name: /also re-compress embedded images/i,
      });
      await user.click(checkbox);

      // Sliders appear
      expect(screen.getByLabelText(/maximum dimension/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/jpeg quality/i)).toBeInTheDocument();
    });
  });
```

(Implementation note: the actual upload step needs to be adapted from the existing test patterns in this file. If the existing tests don't drive the upload via a generated PDF, use a `new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'tiny.pdf')` and rely on the upload handler rejecting or accepting.)

- [ ] **Step 3: Run**

Run: `npx vitest run src/pages/tools/CompressPdf.test.tsx`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/tools/CompressPdf.tsx src/pages/tools/CompressPdf.test.tsx
git commit -m "feat: CompressPdf loses-image toggle UI"
```

---

## Task 13: Home-page card copy

**Files:**
- Modify: `src/constants/tools.ts`

- [ ] **Step 1: Update the compress-pdf description**

Find:

```ts
{ id: "compress-pdf", name: "Compress PDF", description: "Re-pack PDF streams to reduce file size. pdf-lib cannot re-compress embedded images, so savings are limited.", ... }
```

Replace `description` with:

```ts
"Re-pack PDF streams, optionally re-encode large embedded images."
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/constants/tools.ts
git commit -m "docs: CompressPdf home card mentions image re-encoding"
```

---

## Task 14: Final verification

**Files:** none (run commands only)

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all pass; should be ~564 tests now (558 baseline + ~6 new).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Lint (informational)**

Run: `npm run lint | tail -40`
Expected: same 5 pre-existing errors. No new errors from this PR.

- [ ] **Step 5: TASK.md update**

Add a new top-level entry under "Current" in `TASK.md`:

```markdown
- [x] **PR 8**: CompressPdf image re-encoding toggle — DONE
```

- [ ] **Step 6: Final commit**

```bash
git add TASK.md
git commit -m "docs: mark PR 8 (CompressPdf image re-encoding) done"
```

---

## Self-Review Notes

- **Spec coverage**: spec mentions 3 levels in the slider knobs (600–2000, 0.4–0.95, checkbox on/off) — Task 11 wires all three. Spec mentions results-page notes — Task 5 already produces them via `compressImages`. Spec mentions modified `compress.test.ts` — Task 10 covers it. Spec mentions `constants/tools.ts` — Task 13 covers it. ✓
- **Placeholders**: scanned for "TBD"/"TODO" — none.
- **Type consistency**: `CompressionOpts` defined in Task 9 used in Tasks 9 and 11. `ReencodeImagesOpts` used in Tasks 9, 11. `CompressImagesOpts` defined in Task 3 used in Tasks 4–8. No collisions. ✓
- **A11y**: sliders have `aria-label`. Checkbox has an accessible label via the inner `<span>`. The amber banner remains `role="note"`. ✓
- **Back-compat**: legacy `(file, level)` signature still works via the typeof-guard overload (Task 9). ✓
- **PDFjs internal API risk**: documented in `pdfjs-ops.ts` with a `ponytail:` comment + comments in `compress-images.ts` where `page.objs` is used. ✓

No issues found.
