# Production Remediation Inventory

**Baseline commit:** `8f9f63b` (branch `production-readiness/phase-0`)
**Audit reference:** `PRODUCTION_READINESS_AUDIT.md` (audit date 2026-09-24, NO-GO verdict)
**Status:** Baseline classification only. Release states are remediation planning states, not release approval. Task 2's feature registry (`src/config/featureRegistry.ts`) and `ToolAvailabilityGate` (`src/components/tools/ToolAvailabilityGate.tsx`) now gate all canonical routes so disabled tools cannot reach processing/download success states. This inventory does not claim production readiness; Gate G0 remains not passed.

## Release state definitions

- `stable` — audited as a reliable narrow outcome for the basic workflow; no blocking defect recorded by the audit.
- `limited` — usable with material caveats recorded by the audit; requires workstream remediation before broader claims.
- `disabled` — audited as blocked, a no-op/misleading security behavior, or a high-risk confidentiality/privacy defect; the current registry and `ToolAvailabilityGate` block processing/download success while remediation remains outstanding. This is enforcement, not release approval.
- `experimental` — not yet populated; no tool is assigned this state at baseline.

## Owner workstreams

| Workstream | Scope at baseline |
|---|---|
| Foundation | Reproducible install/lockfile, deterministic typecheck/lint, stable tests, feature registry. |
| PDF Security | Protection, decryption, redaction/blackout, page-reference graph safety across page workflows. |
| Privacy/AI/OCR | AI egress/consent/key lifecycle, OCR assets/CSP, camera/scan workflow. |
| Tauri Platform | Native save/download, MIME/picker parity, capabilities/CSP, packaged workflows. |
| Conversion Correctness | Office/HTML/PDF-A/compress/repair/image conversion truthfulness and fidelity. |
| Editor/Accessibility | Editor lifecycle/persistence/performance and accessibility remediation. |
| Release Engineering | CI gates, signing/notarization, updates, audits, documentation reconciliation. |

## Tool inventory (31 tools)

| Tool ID | User-facing name | Audited state | Release state | Privacy class | Owner workstream | Enabling evidence | Known limitation |
|---|---|---|---|---|---|---|---|
| merge-pdf | Merge PDF | OK narrow | stable | local-only | PDF Security | Audit "What is genuinely usable": production-browser merge of two synthetic 3-page PDFs reached success/download; direct library probe produced 6 pages. | Complex catalog/reference preservation (forms, outlines, links, tags, attachments) is not guaranteed. |
| split-pdf | Split PDF | Limited | limited | local-only | PDF Security | Audit outcome matrix: produces extracted output; core split path runs. | Produces one extracted PDF, not a set of independent files as users may expect. |
| remove-pages | Remove Pages | Limited | limited | local-only | PDF Security | Audit outcome matrix: visible pages removed; page-deletion avoids invalid descending-index behavior (audit "What is genuinely usable"). | Deleted objects may remain reachable through links, forms, or other references; not a confidentiality-safe deletion. |
| extract-pages | Extract Pages | Limited | limited | local-only | PDF Security | Audit outcome matrix: basic extraction works. | Forms/catalog structures and other references may be lost. |
| organize-pdf | Organize PDF | Limited | limited | local-only | Editor/Accessibility | Audit outcome matrix: basic editor organization works. | Skin-dependent routes, drag-and-drop and resource limits apply; reorder arrays are not validated as complete permutations. |
| scan-to-pdf | Scan to PDF | Blocked | disabled | camera | Privacy/AI/OCR | Audit P0 blocker 7: shipped Permissions-Policy denies camera; production browser showed "Camera access denied or not available"; no file fallback. | Camera is blocked by shipped policy with no image-file fallback; desktop camera permission workflow unverified. |
| compress-pdf | Compress PDF | Blocked/Misleading | disabled | local-only | Conversion Correctness | Audit outcome matrix and remediation plan P1 item 6: compression levels do not recompress content. | Levels only change yielding/progress behavior; can produce identical output — advertised outcome is not achieved. |
| repair-pdf | Repair PDF | Limited | limited | local-only | Conversion Correctness | Audit outcome matrix: parse/resave path runs. | Parse/resave only; unrecoverable files become placeholder PDFs containing parser error text. |
| ocr-pdf | OCR PDF | Blocked/High risk | disabled | local-only | Privacy/AI/OCR | Audit OCR section: Tesseract defaults to CDN worker/core/language assets the CSP does not allow. | CSP/CDN conflict blocks the flow; text layer is limited; third-party supply-chain dependency and high memory use. |
| jpg-to-pdf | JPG to PDF | OK web / Limited Tauri | limited | local-only | Tauri Platform | Audit outcome matrix: browser image conversion works. | Native MIME loss can skip picked files; photo pixels treated as PDF points produce nonstandard page sizes. |
| html-to-pdf | HTML to PDF | Limited | limited | local-only | Conversion Correctness | Audit Conversions section: renders raster output. | Single rasterized page for all content; no URL fetching; weak pagination/orientation for long or wide HTML. |
| word-to-pdf | Word to PDF | Blocked/Misleading | limited | local-only | Conversion Correctness | Audit P1 item 6: legacy .doc advertised but not parsed by Mammoth. | .doc unsupported; DOCX conversion loses structure and styling — advertised outcome is not achieved. |
| excel-to-pdf | Excel to PDF | Limited | limited | local-only | Conversion Correctness | Audit "What is genuinely usable": minimal valid XLSX converted successfully in the production browser. | .xls/CSV claims and formatting, table, and horizontal-pagination fidelity are incomplete. |
| powerpoint-to-pdf | PowerPoint to PDF | Blocked/Misleading | limited | local-only | Conversion Correctness | Audit P1 item 6: legacy .ppt advertised but not parsed; PPTX becomes lossy regex-extracted text. | .ppt unsupported; PPTX output is lossy text without layout — advertised outcome is not achieved. |
| pdf-to-jpg | PDF to JPG | OK narrow | stable | local-only | Editor/Accessibility | Audit outcome matrix: page rendering and ZIP output coherent. | Subject to memory limits; no aggregate page/pixel/output budget. |
| pdf-to-pdfa | PDF to PDF/A | Blocked as conformance | limited | local-only | Conversion Correctness | Audit outcome matrix: best-effort metadata only; UI warns it is not conformant. | Not PDF/A conformant; only best-effort metadata/OutputIntent is added. |
| pdf-to-word | PDF to Word | Limited | limited | local-only | Conversion Correctness | Audit outcome matrix: conversion runs. | Approximate plain paragraphs, not a layout-faithful editable conversion. |
| pdf-to-excel | PDF to Excel | Limited | limited | local-only | Conversion Correctness | Audit outcome matrix: conversion runs. | Heuristic table extraction; no guarantee of complete/correct data. |
| pdf-to-powerpoint | PDF to PowerPoint | Blocked | disabled | local-only | Conversion Correctness | Audit Conversions section: PNG declared while JPEG bytes are embedded; incomplete slide-master/layout relationships. | Outputs are structurally suspect PPTX packages; blocked pending independent OOXML validation. |
| rotate-pdf | Rotate PDF | OK narrow | stable | local-only | Editor/Accessibility | Audit outcome matrix and "What is genuinely usable": valid fixed-angle page rotation works. | Coordinate handling mixes PDF.js CropBox/rotation rendering with pdf-lib MediaBox assumptions; can misplace content on rotated/non-zero-CropBox pages at higher scope. |
| add-page-numbers | Add Page Numbers | Limited | limited | local-only | Conversion Correctness | Audit outcome matrix: basic placement works. | Six implemented positions while catalog text says nine (implemented surface is smaller than advertised). |
| add-watermark | Add Watermark | Limited | limited | local-only | Conversion Correctness | Audit outcome matrix: watermarking works. | Fixed text style only; some UI wording overstates image/custom behavior. |
| crop-pdf | Crop PDF | OK with caveat | stable | local-only | Editor/Accessibility | Audit outcome matrix: one normalized crop is applied to all pages. | One shared crop for all pages; CropBox/MediaBox/origin normalization needs the unified transform (Phase 4). |
| edit-pdf | Edit PDF | Limited | limited | local-only | Editor/Accessibility | Audit outcome matrix: overlay addition works. | Adds overlays only; does not edit existing PDF text/layout. |
| sign-pdf | Sign PDF | Blocked/Misleading | limited | local-only | PDF Security | Audit outcome matrix: visual image stamp only. | Not certificate-backed or tamper-evident signing — advertised outcome is not achieved. |
| blackout-pdf | Blackout PDF (Redact PDF) | Blocked | disabled | local-only | PDF Security | Audit P0 blocker 4 (runtime probe; editor redaction is now quarantined): the dedicated blackout path remains disabled and retains an original redacted page through inbound references. | Not a trustworthy confidentiality boundary: text remains extractable and removed content can stay reachable; the editor offers no redaction workflow. |
| compare-pdf | Compare PDF | OK narrow | stable | local-only | Editor/Accessibility | Audit outcome matrix: honest side-by-side visual comparison. | No automatic content diff; visual comparison only. |
| decrypt-pdf | Decrypt PDF (Unlock PDF) | Blocked | disabled | local-only | PDF Security | Audit P0 blocker 3: pdf-lib 1.17.1 cannot load genuinely encrypted PDFs (runtime probe). | Cannot reliably open encrypted PDFs, including via the unlock-pdf alias. |
| protect-pdf | Protect PDF | Blocked | disabled | local-only | PDF Security | Audit P0 blocker 2: runtime probe produced output with no /Encrypt dictionary that opened without a password while reporting success. | Protection is a no-op that reports success — false confidentiality signal. |
| ai-summarizer | AI Summarizer | Limited/High risk | disabled | optional-network | Privacy/AI/OCR | Audit P0 blocker 6: sends extracted text to Gemini without a consent step under absolute local-only claims; key/persistence issues. | Undisclosed text egress, no consent/cancellation/limits, summary download includes full source text by default. |
| translate-pdf | Translate PDF (AI Translate) | Blocked/High risk | disabled | optional-network | Privacy/AI/OCR | Audit AI section: key resolver bypass, truncation, unsupported fonts, partial-success semantics. | Per-block requests can silently skip failures and report completion; Helvetica cannot encode several advertised CJK/Arabic/Hindi targets. |

State totals: stable 5, limited 17, disabled 9, experimental 0 — 31 tools total.

## Privacy class assignments (baseline)

- `optional-network`: ai-summarizer, translate-pdf — extracted document text is sent to Gemini (audit P0 blocker 6). These require truthful disclosure and consent before re-enablement.
- `camera`: scan-to-pdf — camera access is the primary (currently policy-blocked) input path.
- `local-only`: all other tools. This classification describes current data flow, not a guarantee; the audit records that visual "Files never leave your device" copy overstates behavior for AI pages, and that no aggregate resource limits exist.

The companion feature registry (Task 2) mirrors these privacy classes and release states exactly. Current enforcement is implemented in `src/config/featureRegistry.ts` and `src/components/tools/ToolAvailabilityGate.tsx`, which gate all canonical routes; these classifications remain remediation planning states, not release approval.

## Workstream assignments for disabled and limited tools

- **Foundation (densest first):** owns the registry plus Task 3-5 gate repair; the current registry and `ToolAvailabilityGate` already gate disabled tools, while remaining work tracks their remediation.
- **PDF Security:** protect-pdf, decrypt-pdf, blackout-pdf, sign-pdf, split-pdf, remove-pages, extract-pages, merge-pdf graph-safety follow-up.
- **Privacy/AI/OCR:** ai-summarizer, translate-pdf, scan-to-pdf, ocr-pdf.
- **Tauri Platform:** jpg-to-pdf (native MIME/page sizing) and the native save/CSP path that affects output delivery of every DownloadState tool (audit P0 blocker 5).
- **Conversion Correctness:** compress-pdf, repair-pdf, html-to-pdf, word-to-pdf, excel-to-pdf, powerpoint-to-pdf, pdf-to-pdfa, pdf-to-word, pdf-to-excel, pdf-to-powerpoint, add-page-numbers, add-watermark.
- **Editor/Accessibility:** stable and limited page tools' shared editor experiences (organize-pdf, edit-pdf, crop-pdf, rotate-pdf, compare-pdf, pdf-to-jpg) plus annotation/keyboard/label work (audit "Accessibility and UX").
- **Release Engineering:** owns the baseline evidence below, gate restoration tracking, and documentation reconciliation of all statuses.

## Baseline environment (from the audit; not rerun in this task)

- OS: Windows 11 x64.
- Node v24.18.0 (audit); npm 11.18.0; rustc 1.98.0. `nvmrc` requests Node 22 — the mismatch is itself a Phase 0 finding.
- Audited revision: `feat/tauri-desktop` at `8f9f63b`.
- Generated `dist/`, coverage output, and Rust target output were refreshed during the audit; MSI and NSIS artifacts were produced (both unsigned).

### Failing gate evidence (as audited; not rerun)

| Gate | Audited result | Key evidence |
|---|---|---|
| `npm ci --dry-run --ignore-scripts --no-audit --no-fund` | FAIL (EUSAGE) | package-lock.json missing root deps (Tauri packages, React types, Sharp); .npmrc sets package-lock=false; CI runs npm ci. |
| `npm run typecheck` | FAIL | Clean-tree source errors in Canvas, SortableThumbnail, tool catches, ToolErrorBoundary, security test mocks; state-dependent after Tauri build (allowJs scans src-tauri/target). |
| `npm run lint` | FAIL | Clean-tree: 1 error (OnboardingTour.tsx:71) + 213 warnings; 64 errors after Tauri build from unignored generated assets. |
| `npm test` | FLAKY | Varied between 615/615 and 1-2 timing-sensitive failures; final isolated coverage run passed 79 files/615 tests. |
| `npm audit --json` | FAIL | One high advisory in dev dep sharp 0.35.3 (fix: 0.35.4). |
| Installer signatures | FAIL | MSI and NSIS Authenticode NotSigned. |
| `cargo-audit` | SKIPPED | Not installed; Rust CVE status unknown. |
| CSP blob fetch probe | FAIL | fetch(blob:) rejected; Tauri DownloadState depends on it (P0 blocker 5). |
| Camera workflow | FAIL | "Camera access denied or not available" in production browser (P0 blocker 7). |
| Home accessibility | PARTIAL PASS | Desktop axe 0 violations (10 incomplete contrast checks); mobile 1 serious unnamed-link violation. |

## Next step

The current feature registry (`src/config/featureRegistry.ts`) and `ToolAvailabilityGate` (`src/components/tools/ToolAvailabilityGate.tsx`) encode and enforce these release states and privacy classes across all canonical routes, so unavailable tools cannot reach processing/download success states. These states remain remediation planning states, not release approval; Gate G0 remains not passed.
