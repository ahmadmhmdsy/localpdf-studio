# Competitive Analysis & Feature Roadmap

Status: PLANNED — research and proposal only; no code has changed.
Date: 2026-10-24

## 1. Where LocalPDF Studio stands today

The tool catalog (`src/constants/tools.ts`) already mirrors iLovePDF's homepage
category-for-category (Organize / Optimize / Convert to / Convert from / Edit /
Security / Intelligence). **Breadth on paper is at parity. The gap is depth and
working state.**

From `src/config/featureRegistry.ts` and `docs/release/production-inventory.md`:

| State | Tools |
|---|---|
| Disabled (9) | Scan to PDF, OCR, PDF→PowerPoint, Blackout/Redact, Unlock, Protect, AI Summarizer, Translate, (PPT→PDF is "limited"/lossy) |
| Shallow | Compress (pdf-lib can't re-encode images), Compare (side-by-side only, no diff), Watermark (fixed text/style), Rotate (all pages same angle) |
| Missing vs competitors | PDF Forms (fill + create), PDF → Markdown/Text, bookmarks/TOC, metadata editor, flatten, batch processing, workflows/chaining, i18n |

Root cause of most blockers: **pdf-lib is the only write engine.** It cannot
decrypt, encrypt, truly redact, or recompress images.

## 2. Competitor snapshot

| Capability | iLovePDF | Adobe Acrobat Pro | WPS PDF | Stirling-PDF (OSS) | BentoPDF (OSS) | **Us** |
|---|---|---|---|---|---|---|
| Processing location | Server upload | Desktop + cloud | Desktop + cloud | Self-hosted server | Browser (WASM) | **Browser** |
| Tool count | ~30 | 70+ | ~30 + office suite | 50+ | 50+ | 33 (24 enabled) |
| Edit existing text in place | Limited | Yes | Yes (AI font matching) | Basic | Basic | No (overlay only) |
| True redaction | Yes | Yes | Yes | Yes | Yes | **Disabled** |
| Protect / Unlock | Yes | Yes | Yes | Yes | Yes | **Disabled** |
| OCR | Yes (premium "advanced") | Yes | Yes | Yes (Tesseract/OCRmyPDF) | Yes | **Disabled** |
| Forms fill / create | Yes (new) | Yes | Yes | Yes | Yes (incl. XFA) | No |
| Compare with diff | Yes | Yes | Yes | Yes | Yes | Visual only |
| Workflows / pipelines | Yes (paid) | Action Wizard | — | Yes (no-code + API) | — | No |
| Batch | Yes | Yes | Yes | Yes | Yes | Rotate only |
| AI summarize / chat / translate | Yes | Add-on ($) | Yes | — | — | **Disabled** |
| Localization | ~30 languages | Many | Many | 40+ | Several | English only |
| Pricing | Free tier, ~$9/mo | ~$20/mo | Free w/ ads, Pro sub | Free / open-core | AGPL / $79 lifetime | Free, MIT |

**Our real differentiator:** files never leave the device, MIT-licensed, plus a
desktop build (Tauri). iLovePDF uploads every file; Adobe/WPS push cloud. That
is the positioning to lean into — "everything iLovePDF does, without uploading".

### Lessons from open source

- **Stirling-PDF**: pipelines (chain tools into a saved recipe) are its most-loved
  feature; clear per-tool pages; 40+ languages via community translation files.
  Mistake to avoid: a heavy Java server — contrary to our local-first model.
- **BentoPDF**: proves a full client-side toolkit is viable with WASM engines.
  Mistake to avoid for us: it loads AGPL engines (PyMuPDF, Ghostscript, CPDF)
  from a CDN at runtime — that conflicts with our MIT license *and* our CSP /
  no-egress guarantees (`docs/privacy/data-flow.md`).
- **PDF.js** (already a dependency): ships an annotation editor layer
  (free text, ink, stamp/image, highlight) and AcroForm rendering we can reuse
  instead of hand-building.

## 3. Engine strategy (unblocks most disabled tools)

All candidates must be bundled locally (no CDN) to keep the CSP and privacy claims true.

| Engine | License | Unblocks | Notes |
|---|---|---|---|
| **qpdf (WASM build)** | Apache-2.0 | Protect, Unlock, Repair, Linearize ("fast web view") | Real `/Encrypt` dictionaries (AES-256). Needs a vetted WASM build; verify maintenance. |
| **PDFium via `@embedpdf/pdfium`** | MIT (package metadata) | True redaction (remove text/image objects), text extraction with positions, faster rendering, flatten | Community reports the PDFium source fork may not be fully public — verify before adopting. |
| **Tesseract.js, self-hosted assets** | Apache-2.0 | OCR | Already a dependency; blocker is only CDN asset loading vs CSP. Serve worker/core/traineddata from `public/`. |
| **Canvas re-encode (no new dep)** | — | Real image compression | Decode image XObjects, downsample/re-encode as JPEG, write back with pdf-lib. |
| MuPDF / Ghostscript / CPDF | AGPL | — | **Avoid** unless buying commercial licenses; incompatible with MIT distribution. |

## 4. Prioritized roadmap

Ordering principle: fix what's advertised before adding new tools; each phase is
independently shippable and keeps the "truthful copy" gate from G1.

### Phase A — Make existing tools real (highest ROI)
1. **OCR**: self-host Tesseract assets, add language picker, output searchable PDF (invisible text layer).
2. **Scan to PDF**: add image-file fallback (no camera required); camera stays desktop-only until policy is resolved.
3. **Compress**: real image downsampling with Low/Medium/High presets and a before/after size preview.
4. **Protect / Unlock**: qpdf WASM; include permissions (print/copy/edit) options.
5. **Redact**: PDFium object removal + flatten + verification step (re-extract text to prove removal) before claiming success.

### Phase B — UX parity with paid apps
1. **Batch mode** for every single-file tool (queue, per-file progress, ZIP download).
2. **Workflows**: chain tools (e.g. Merge → Compress → Number pages → Protect), save as local presets. Differentiator vs iLovePDF's paid workflows.
3. **Unified file shelf**: drop once, pick a tool after; recent files (IndexedDB, opt-in); thumbnails everywhere.
4. **Richer options**: per-page rotate in Organize, watermark image/opacity/position/page range, page-number formats ("Page 1 of N", start number, ranges).
5. **Command palette** (Ctrl+K) to jump to any tool; consistent result screen (download / continue with another tool / start over) — the iLovePDF "continue" pattern.
6. **i18n** framework + RTL support (Arabic is a natural first target).

### Phase C — Editor depth (Acrobat/WPS territory)
1. Adopt PDF.js editor layer for highlight / underline / strikeout / sticky notes / comments panel.
2. **Forms**: fill AcroForms (pdf-lib supports this), then a form-field designer (text, checkbox, radio, dropdown, signature).
3. Bookmarks/outline editor, metadata editor, flatten annotations/forms.
4. Find & search text in viewer; page labels.
5. In-place text editing (hardest; PDFium text objects; start with "replace text in same font when glyphs exist").

### Phase D — New tools competitors have
- PDF → Markdown / Text, PDF → HTML, Extract images, Compare with text diff + highlighted changes, PDF/A validation report, Split by bookmarks/size.

### Phase E — Intelligence (opt-in, consent-first)
- Re-enable AI Summarize / Translate / "Chat with PDF" only with explicit per-run consent, cancellation, size limits, and desktop-held keys — or a local model option (e.g. WebGPU in-browser) to stay fully private.

## 5. Risks & open questions

- **Copy reuse:** several tool descriptions in `src/constants/tools.ts` closely match iLovePDF's wording (e.g. "the easiest PDF merger available"). Rewrite in our own voice to avoid brand/copyright issues.
- **Bundle size:** WASM engines are 2–10 MB each; lazy-load per tool and keep `check:bundle` budgets per chunk.
- **Licensing:** verify every engine's license and source availability before adding (see §3).
- **Memory:** 100 MB limit plus WASM heaps; run heavy work in Web Workers.
- **Native vs web:** some features (camera, large files, AI keys) may stay desktop-only; the feature registry already supports this split.

## Sources

- iLovePDF homepage tool list: https://www.ilovepdf.com/
- iLovePDF reviews/pricing: https://www.softwareadvice.com/cms/ilovepdf-profile/ , https://toolradar.com/tools/ilovepdf
- Adobe Acrobat pricing/features: https://www.adobe.com/acrobat/pricing
- WPS PDF editor: https://www.wps.com/blog/feature-edit-pdf , https://thebusinessdive.com/wps-office-review
- Stirling-PDF: https://github.com/Stirling-Tools/Stirling-PDF
- BentoPDF: https://fossunited.org/hack/fosshack26/p/5irgr29o83
- EmbedPDF PDFium: https://www.jsdelivr.com/package/npm/@embedpdf/pdfium , https://discuss.privacyguides.net/t/javascript-pdf-viewer-alternative-to-adobe-acrobat-pdf-viewer/30078
- qpdf license: https://qpdf.readthedocs.io/en/11.7/license.html
- MuPDF license: https://mupdf.readthedocs.io/en/1.27.0/license.html
