# Phase A: Make the Disabled and Shallow Tools Real

**Goal:** Every tool in `src/config/featureRegistry.ts` either delivers the outcome its name promises, locally, or stays `disabled` with truthful copy. No tool moves to `limited` or `stable` without the release gate in `docs/privacy/data-flow.md`: local assets, consent where data could leave the device, cancellation, resource limits, and independent verification.

**Context:** [competitive-analysis.md](../../competitive-analysis.md) ranks these tools by user expectation; iLovePDF, Adobe and WPS all ship OCR, compression, protect/unlock and redaction as baseline features.

**Stack constraints:** Node 22.14 with npm only. pdf-lib 1.17.1 (standard fonts, WinAnsi only), pdfjs-dist 6, tesseract.js 5.1.1, Vitest 4 with jsdom, a strict CSP with no `blob:` workers and no third-party hosts. Every new dependency or downloaded asset needs the user's approval first (CLAUDE.md §9).

---

## Status after the first slice (2026-10-24)

| Tool | State | What is done | What blocks release |
|---|---|---|---|
| compress-pdf | disabled | Real image recompression (`src/lib/compress.ts`) with presets: light 200 DPI / q0.8, balanced 150 / q0.65, strong 96 / q0.5. CMYK, indexed and 16-bit images are skipped. Result notes are shown in the UI. Unit-tested. | Independent verification on a real corpus; no cancellation; no per-file size limit. |
| ocr-pdf | limited | Self-hosted worker and core emitted by the `ocrAssets()` Vite plugin; invisible text layer positioned per word (rotation-aware); pages with text skipped; a missing-language-data error; English and Arabic data (tessdata_fast 4.1.0) self-hosted; a glyphless Unicode text layer (Arabic written in visual order, verified by a pdf.js round trip); cancellation via `AbortSignal` with a Cancel button that terminates the worker; 200-page and 50 MB limits (`src/constants/limits.ts`) shown in the configure step; an optional page-range input (the page cap applies to the selected pages, so a long PDF can be done in parts). Unit-tested. | No e2e run; only English and Arabic data; independent verification. |

---

## Workstream 1: Finish OCR (highest priority)

1. **Language data — done for `eng` and `ara` (option A).** Choose one source and record the source, license (Apache-2.0) and SHA-256 of each file in `public/tesseract/lang/README.md`:
   - A. Download `tessdata_fast` LSTM models into `public/tesseract/lang/<code>.traineddata.gz`. These are small (eng ≈ 2 MB gzipped) and have no npm dependency.
   - B. Add the `@tesseract.js-data/<lang>` npm packages and copy them in `ocrAssets()`. This keeps versions pinned in the lockfile.
   - Owner decision (2026-10-24): English and Arabic first; the other languages later.
2. **Cancellation — done.** Add an `AbortSignal` to `OcrOptions`. Check it between pages and between render/recognize; `worker.terminate()` on abort. Add a "Cancel" button in the processing step that returns to configure. Test that abort mid-run terminates the worker and destroys the loading task.
3. **Limits — done.** The page-range input reuses `parsePageRanges` from `src/lib/pdf.ts`; invalid ranges are shown next to the input. Reject files over a page cap (start at 200 pages) and a size cap before loading. Show the limit in the configure step. Add a page-range input (reuse the page-range parser from split/extract if it exists; otherwise add one in `src/lib/utils.ts` with tests).
4. **Non-Latin scripts — done without a new dependency.** `src/lib/glyphlessFont.ts` builds a glyphless Type0/Identity-H font with a ToUnicode CMap (as Tesseract's own PDF renderer does), so any BMP script can be stored; right-to-left words are written in visual order (`toVisualOrder` in `src/lib/ocr.ts`).
5. **e2e.** In `e2e/smoke.spec.ts`, keep the "disabled routes load no tesseract worker" assertion until the flip. At flip time, replace it with a test that runs OCR on a fixture scan and asserts that only same-origin requests were made and that the output's text is extractable.
6. **Release flip (one commit, with user approval):** registry `releaseState`, the CSP `worker-src`/`connect-src` check, e2e allowed hosts, `docs/privacy/data-flow.md`, and `docs/release/production-inventory.md`.

**Acceptance:** A scanned 10-page English PDF becomes searchable in a production build with network egress limited to the app origin; cancel works within one page; a 500-page file is refused with a clear message.

## Workstream 2: Verify and enable compression

1. Build a fixture corpus in `src/tests/fixtures/` (generated, not downloaded): a JPEG-heavy scan, a PNG with alpha, a CMYK JPEG, an indexed PNG, a text-only PDF, and an already-optimized PDF.
2. Add tests asserting, for each preset, that output ≤ input for image-heavy files, that output is never larger than the input (fall back to the original bytes and say so), that skipped image kinds are listed in the notes, and that page count and text extraction are unchanged.
3. Add cancellation and a size limit, the same way as for OCR.
4. Replace the three "Compression Level" buttons, which only change object-stream packing, with a single preset choice; image presets are what users expect "compression level" to mean. Keep `quality` in the library API for compatibility.
5. Flip to `limited` after independent verification, with the user's approval.

## Workstream 3: Protect / Unlock (protect-pdf, decrypt-pdf)

pdf-lib cannot encrypt or decrypt. Options:
- **qpdf compiled to WASM** (Apache-2.0). It handles AES-256 encryption, decryption with a known password, and linearization. It would be a new dependency of about 1–2 MB and must be self-hosted like Tesseract. **Recommended.**
- Writing an AES/RC4 security handler on top of pdf-lib is not recommended: it is easy to get wrong and hard to verify.

Steps: a spike to confirm a maintained qpdf-wasm build loads under the CSP without `blob:` workers; a `src/lib/qpdf.ts` adapter behind an interface; tests that round-trip encrypt → decrypt and that check that a wrong password fails clearly; never log passwords. Unlocking must require the password; removing restrictions from an owner-password-only file is a policy decision for the user.

## Workstream 4: True redaction (blackout-pdf)

Drawing black boxes is not redaction. Real redaction must remove text, image pixels and vector content under the box, and strip metadata, annotations, form values and embedded files.
1. Evaluate PDFium WASM (BSD-3) and MuPDF WASM (AGPL — **license conflict likely; needs user decision**) for content removal; qpdf alone cannot rewrite content streams by region.
2. Pipeline: the user marks areas or search hits → the engine removes content inside them → flatten → strip metadata → save a new file.
3. **Verification step, shown to the user:** re-open the output with pdf.js and assert that no text item intersects a redacted area; refuse to report success otherwise.
4. Keep the editor's legacy `RedactAnnotation` quarantine (see `2026-09-25-redaction-review-followups.md`) until this ships.

## Workstream 5: Scan to PDF

1. Add an image-file fallback (`<input type="file" accept="image/*" capture="environment">`), which works without camera permission and reuses the jpg-to-pdf pipeline.
2. Camera access: changing the shipped `Permissions-Policy` to `camera=(self)` is a security-setting change and needs user approval. Verify the Tauri desktop permission flow separately.
3. Optional later: edge detection and perspective correction (OpenCV.js is large; evaluate a small custom implementation first).

## Workstream 6: Office conversions

- **pdf-to-powerpoint (disabled):** declare the correct image content type (`image/jpeg` for JPEG bytes); add `slideMaster`, `slideLayout` and theme parts with their relationships; validate the package against the OOXML schema in tests (zip structure + `[Content_Types].xml` + rels). Independent check: opens in PowerPoint and LibreOffice.
- **word-to-pdf / powerpoint-to-pdf (limited, outcome not achieved):** the honest local options are a better DOCX/PPTX layout renderer (large effort) or LibreOffice in the desktop build only. Recommend the desktop-only LibreOffice path, gated on detecting an installed `soffice`, using a safe subprocess API with a timeout; the web build keeps its "lossy" label.
- **Legacy .doc/.ppt/.xls:** desktop-only via the same LibreOffice path; the web build rejects them with a clear message.
- **Bundle:** `office-parsers` is 1773.8 KB against the 800 KB per-chunk limit in `scripts/check-bundle-size.mjs`. Split the parsers per format with dynamic imports so each tool loads only its own parser.

## Workstream 7: Shallow tools (smaller fixes)

| Tool | Fix |
|---|---|
| split-pdf | Output a ZIP of separate files (by range, every N pages, or each page). |
| remove-pages | Rebuild the document by copying the kept pages into a new PDF, so deleted objects are not reachable. |
| html-to-pdf | Paginate by measuring content height per page instead of one rasterized page; offer orientation. |
| jpg-to-pdf | Map pixels to points at the image DPI (default 96, cap to A4/Letter fit options); fix the MIME-loss skip. |
| add-page-numbers | Implement the three missing positions, or change the catalog text to six. |
| add-watermark | Image watermark, font size, opacity and rotation controls; fix overstated copy. |
| pdf-to-pdfa | Rename to "PDF/A-style" until a validator (veraPDF, desktop-only) confirms conformance. |
| sign-pdf | Keep the "visual signature" wording; certificate signing is a separate future project. |
| repair-pdf | Never return a placeholder PDF as "repaired"; report failure instead. qpdf (Workstream 3) can do real repairs. |
| ai-summarizer / translate-pdf | Out of Phase A scope: need consent, disclosure, cancellation and a local-model decision. |

## Ordering

1. OCR language data + cancellation + limits (Workstream 1), then compression verification (2): these close out the first slice.
2. Split the office-parsers chunk so `check:bundle` passes again.
3. qpdf spike (3); if it passes, protect/unlock, then a real repair-pdf.
4. Scan-to-PDF image fallback (5) and the small fixes (7), in parallel.
5. Redaction engine evaluation (4) and the office conversions (6), each with its own plan once the engine decisions are made.

## Decisions needed from the user

1. The OCR language-data source (download `tessdata_fast` vs. the `@tesseract.js-data` npm packages).
2. Approval to add qpdf-wasm (Workstream 3).
3. The redaction engine and its license (PDFium vs. MuPDF/AGPL).
4. Whether to loosen `Permissions-Policy` for the camera.
5. When to flip each tool's `releaseState`; this is a release decision, not part of the implementation.

## Validation for every workstream

`npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build`, `npm run check:bundle`, `npm run test:e2e`, plus manual checks on real files in the production build. Report each result as PASS, FAIL or SKIPPED.
