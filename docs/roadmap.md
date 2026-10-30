# LocalPDF Studio Roadmap

**Status date:** 2026-10-30
**Owner:** Ahmad Mahmoud. Release flips, new dependencies and security-setting changes need the owner's approval.
**Sources:**
- [competitive-analysis.md](competitive-analysis.md): the phases and the reasons for them.
- [Phase A plan](superpowers/plans/2026-10-24-phase-a-tools.md): workstream detail for Phase A.
- [production-inventory.md](release/production-inventory.md): the release state of each tool.

This is the single place to see what is done, what is in review and what is next. Each milestone has an ID (for example `A2.3`) for use in branch names, commits and PR titles. When a milestone changes state, update this file in the same PR.

**Status values:**

| Status | Meaning |
|---|---|
| DONE | Merged to `main` |
| IN REVIEW | Open PR |
| READY | Unblocked, not started |
| BLOCKED | Waiting on a decision or another milestone |
| PLANNED | Later phase, not started |

---

## 0. Rules that apply to every milestone

1. **Release gate.** No tool moves to `limited` or `stable` without everything in [data-flow.md](privacy/data-flow.md):
   - local assets
   - consent where data could leave the device
   - cancellation
   - resource limits
   - independent verification on real files in a production build

   Each flip is its own commit, approved by the owner.
2. **Truthful copy.** Tool names, descriptions and limitations say what the tool really does. If a tool cannot deliver its outcome, it stays `disabled`.
3. **No hardcoding.** See [§7](#7-no-hardcoding-rule) and CLAUDE.md §6a. This rule is checked in code review.
4. **No new engine or dependency without approval**, a license check and a bundle-budget check (`npm run check:bundle`). Avoid AGPL engines (MuPDF, Ghostscript, CPDF).
5. **Validation for every PR:**
   - `npm run typecheck`
   - `npm run lint`
   - `npx vitest run`
   - `npm run build`
   - `npm run check:bundle`
   - `npm run test:e2e`

   Report each result as PASS, FAIL or SKIPPED.

---

## 1. Where things stand

| Item | Status | Where |
|---|---|---|
| Phase 0 / G1 production readiness, OCR (English and Arabic), README rewrite | DONE | PR #1, merged |
| Compression WS2: corpus, cancel, 100 MB limit, never-larger fallback, preset UI | DONE | PR #2, merged |
| README showcase: GIF, screenshots, Arabic README, fix for stale "OCR unavailable" copy | DONE | PR #3, merged |
| This roadmap and the no-hardcoding rule | DONE | PR #4, merged |
| OCR e2e (A1.3), shallow-tool fixes (A7.1, A7.2, A7.5, A7.7, A7.9, A7.10), generated tool routes (backlog #15) | DONE | [PR #6](https://github.com/ahmadmhmdsy/localpdf-studio/pull/6), merged |
| HTML-to-PDF pagination and orientation (A7.3), DPI-aware JPG-to-PDF (A7.4), watermark options (A7.6), office-chunk recheck (A6.3) | DONE | [PR #7](https://github.com/ahmadmhmdsy/localpdf-studio/pull/7), merged |
| i18n foundation and RTL (B1.1): typed English/Arabic catalogs, persisted locale, header language switcher, `dir="rtl"`, translated shell and tool chrome | DONE | [PR #8](https://github.com/ahmadmhmdsy/localpdf-studio/pull/8), merged |
| i18n catalog copy (B1.2a): tool names, descriptions and category headings in locale files, Arabic catalog (31 tools, 7 categories), locale-bound `useI18n()` helpers, Home/HomeBento search and Limitations reading them | DONE | [PR #9](https://github.com/ahmadmhmdsy/localpdf-studio/pull/9), merged |
| i18n home-page chrome (B1.2b): hero, bento tiles, search placeholder, status badges, quick-pick chips, privacy block, unavailable/MVP toasts in both skins, with an Arabic chrome test | DONE | [PR #10](https://github.com/ahmadmhmdsy/localpdf-studio/pull/10), merged |
| i18n tool pages, organize group (B1.3a): Merge PDF, Split PDF, Remove pages, Extract pages and Organize PDF read titles, descriptions, steps, buttons, toasts and processing copy from the catalogs, with Arabic tests | DONE | [PR #11](https://github.com/ahmadmhmdsy/localpdf-studio/pull/11), merged |
| i18n tool pages, optimize group (B1.3b): Compress PDF, Repair PDF, OCR PDF and Scan to PDF read their copy from the catalogs, with Arabic tests; Repair PDF's library now reports issue codes instead of English sentences | IN REVIEW | [PR #12](https://github.com/ahmadmhmdsy/localpdf-studio/pull/12), `phase-b/tool-pages-2` |
| UI/UX redesign: research and round 2 direction worlds are in `docs/design/`, `docs/research/` and `prototypes/` (not committed yet); nothing is in `src/` | BLOCKED | Owner picks a world (§8, item 10) |

**Tool release states on `main`, from `src/config/featureRegistry.ts`:**
- `ocr-pdf` is `limited`.
- `compress-pdf` stays `disabled` until A2.2.
- These are also `disabled`: scan-to-pdf, pdf-to-powerpoint, blackout-pdf, decrypt-pdf, protect-pdf, ai-summarizer, translate-pdf.

---

## 2. Phase A: make the existing tools real

Goal: every catalog tool delivers what its name promises, locally, or stays `disabled` with truthful copy.

### A1. OCR (English and Arabic)

| ID | Task | Status | Acceptance |
|---|---|---|---|
| A1.1 | Self-hosted worker and core, English and Arabic `tessdata_fast`, invisible text layer, glyphless Unicode font, RTL visual order | DONE | Unit tests; pdf.js round trip |
| A1.2 | Cancellation, 200-page and 50 MB limits, page-range input | DONE | Unit tests |
| A1.3 | e2e: run OCR on a fixture scan; assert only same-origin requests and extractable output text | DONE | `e2e/ocr.spec.ts` generates a one-page raster scan, runs OCR, asserts every request is same-origin (including the self-hosted worker/core/lang fetches) and that the downloaded PDF's text contains the words. The smoke test now only asserts that the OCR engine stays lazy on mount. |
| A1.4 | Real-file check in a production build: a 10-page English scan, an Arabic scan, cancel within one page, a 500-page file refused | READY | A PASS/FAIL table recorded in the Phase A plan |
| A1.5 | Release checklist audit: CSP `worker-src`/`connect-src`, e2e allowed hosts, data-flow.md, production-inventory.md | READY, after A1.3 and A1.4 | All items ticked in one commit |
| A1.6 | More languages (French, German, Spanish, Turkish, Urdu, Persian), one at a time with license and SHA-256 recorded | PLANNED | Owner chooses the order |

### A2. Compression

| ID | Task | Status | Acceptance |
|---|---|---|---|
| A2.1 | WS2 library and UI work | DONE (PR #2) | Unit tests; a real-file browser check on generated PDFs: all PASS (see §6.2) |
| A2.2 | Before the flip, check the **production UI path**: a local build with `compress-pdf` turned on, real scans (not generated noise), and Firefox plus one mobile browser | BLOCKED: owner-supplied real scans | A PASS/FAIL table; memory stays usable on a 100 MB file. The code work (PR #2) is merged; this check needs real scans from the owner and a local-only flip. |
| A2.3 | Release flip to `limited` | BLOCKED: owner approval | One commit: registry, data-flow, inventory |
| A2.4 | Handle the image kinds that are currently skipped (CMYK, indexed, 16-bit, soft masks) or keep listing them in the notes | PLANNED | Corpus tests for each kind |
| A2.5 | A before/after size preview before downloading | PLANNED | UI test |

### A3. Protect and Unlock (qpdf WASM)

| ID | Task | Status | Acceptance |
|---|---|---|---|
| A3.0 | **Decision:** approve adding a qpdf WASM build (Apache-2.0, about 1–2 MB, self-hosted) | BLOCKED: owner | Approval recorded |
| A3.1 | Spike: a maintained build loads under the CSP without `blob:` workers; check its license and source | BLOCKED by A3.0 | Spike notes in the Phase A plan |
| A3.2 | A `src/lib/qpdf.ts` adapter behind an interface, lazy-loaded per tool | BLOCKED by A3.1 | Unit tests |
| A3.3 | Protect: AES-256, user and owner passwords, permission options (print, copy, edit) | BLOCKED by A3.2 | Encrypt → decrypt round trip; opens in Acrobat or pdf.js with the password |
| A3.4 | Unlock: requires the password; a wrong password fails with a clear message; passwords are never logged | BLOCKED by A3.2 | Tests, plus a log audit |
| A3.5 | **Decision:** whether to remove restrictions from files that have only an owner password | BLOCKED: owner | Policy recorded |
| A3.6 | A real `repair-pdf` and Linearize ("fast web view") through qpdf | BLOCKED by A3.2 | Broken-file corpus test |

### A4. True redaction

| ID | Task | Status | Acceptance |
|---|---|---|---|
| A4.0 | **Decision:** the engine. Recommended: PDFium (`@embedpdf/pdfium`, BSD-3/MIT), after confirming its source is public. MuPDF is AGPL. | BLOCKED: owner | Approval recorded |
| A4.1 | Pipeline: mark areas or search hits → remove text, image pixels and vector content → flatten → strip metadata, annotations, form values and embedded files → new file | BLOCKED by A4.0 | Unit tests on a corpus |
| A4.2 | A verification step the user sees: re-open with pdf.js; fail if any text item intersects a redacted area | BLOCKED by A4.1 | Never reports success when content remains |
| A4.3 | Keep the editor's `RedactAnnotation` quarantine until A4.2 ships | ONGOING | — |

### A5. Scan to PDF

| ID | Task | Status | Acceptance |
|---|---|---|---|
| A5.1 | Image-file fallback with `<input accept="image/*" capture="environment">`, reusing the jpg-to-pdf pipeline | READY | Works on mobile without camera permission |
| A5.2 | **Decision:** change `Permissions-Policy` to `camera=(self)` (a security setting) | BLOCKED: owner | Approval recorded |
| A5.3 | Live camera capture, and the Tauri desktop permission flow | BLOCKED by A5.2 | Manual check on web and desktop |
| A5.4 | Edge detection and perspective correction (try a small custom implementation before OpenCV.js) | PLANNED | — |

### A6. Office conversions

| ID | Task | Status | Acceptance |
|---|---|---|---|
| A6.1 | pdf-to-pptx: the master, layout and `image/jpeg` content type now exist in `src/lib/pdf-to-pptx.ts`; the **theme part** and a schema-level package test are still missing | READY | Opens in PowerPoint and LibreOffice |
| A6.2 | Desktop-only LibreOffice path for Word→PDF, PPT→PDF and the legacy .doc/.ppt/.xls formats: detect `soffice`, use a safe subprocess API with a timeout | PLANNED | The web build keeps its "lossy" label and rejects legacy formats clearly |
| A6.3 | Recheck the office-parsers chunk against the 800 KB per-chunk budget (it was split in commit 2024473) | DONE | `check:bundle` PASS: 66 chunks, 4622.3 KB total; the old office chunk is now exceljs 917.6 KB (under its own 1000 KB limit), mammoth 492.3 KB, docx 362.0 KB — nothing above the 800 KB default. |

### A7. Shallow tools

| ID | Tool | Fix | Status |
|---|---|---|---|
| A7.1 | split-pdf | Output a ZIP of separate files (by range, every N pages, or one file per page) | DONE |
| A7.2 | remove-pages | Copy the kept pages into a new document, so the deleted objects are gone | DONE |
| A7.3 | html-to-pdf | Paginate by content height; add an orientation option | DONE | A4 pages sliced at exact page height with a Portrait/Landscape control; verified in the production build (4 portrait pages, 5 landscape pages, all A4 page sizes, every page raster distinct so no duplicated content). |
| A7.4 | jpg-to-pdf | Pixels → points at the image DPI; fit options; fix the MIME-loss skip | DONE | Format from magic bytes (empty MIME still converts), DPI from JFIF/pHYs with a 72 fallback, A4/Letter with contain/fill, skipped files named instead of dropped; browser check: 300 DPI JPEG → 595.28×841.89 pt A4 page, image-size page 288×384 pt, WebP listed as skipped while the valid JPEG still converted. |
| A7.5 | add-page-numbers | The UI has 6 positions while the copy promises 9. Add the 3 middle positions, or change the copy. | DONE |
| A7.6 | add-watermark | Image watermark, font size, opacity, rotation, page range; fix the overstated copy | DONE | Options-object API; text and image watermarks, rotation-safe centring, page-range validation, WinAnsi guard with a clear error; browser check: range "2" stamped once, the default range stamped all 3 pages, an image watermark drawn on 3 pages, Arabic text refused with no download. |
| A7.7 | pdf-to-pdfa | Rename to "PDF/A-style" until a validator (veraPDF, desktop) confirms conformance | DONE |
| A7.8 | sign-pdf | Keep the "visual signature" wording; certificate signing is a later project | ONGOING |
| A7.9 | repair-pdf | Never return a placeholder PDF as "repaired"; report the failure instead (a real repair comes with A3.6) | DONE |
| A7.10 | Catalog copy | Rewrite descriptions that copy iLovePDF wording ("the easiest PDF merger available", and others in `src/constants/tools.ts`) | DONE |

**Phase A exit criteria:**
- Every catalog tool is `stable`, `limited` with honest limitations, or `disabled` with truthful copy.
- OCR and compression are flipped.
- Protect, Unlock and Redact are either shipped or blocked only on a recorded decision.

---

## 3. Phase B: UX parity with paid apps

| ID | Milestone | Depends on | Acceptance |
|---|---|---|---|
| B1 | **i18n framework and RTL.** Move all UI copy (catalog, registry text, pages, errors) into locale files; English and Arabic first; `dir="rtl"`; logical CSS properties. **Do this first:** every later feature then avoids hardcoded strings. | None | No user-visible literal outside the locale files (lint rule or test); Arabic UI passes axe; the layout mirrors correctly |
| B2 | **Batch mode** for every single-file tool: a queue, per-file progress, per-file errors, a ZIP download | A7.1 (ZIP helper) | Works for 50 files within the existing limits; cancel stops the queue |
| B3 | **Workflows:** chain tools (for example Merge → Compress → Number pages → Protect) and save them as local presets | B2; tool operations exposed as pure functions | A preset runs end to end; presets are stored locally and can be exported as JSON |
| B4 | **Unified file shelf:** drop a file once, then pick a tool; thumbnails everywhere; opt-in recent files in IndexedDB that can be cleared | None | Recent files are off by default; "clear" removes all stored data |
| B5 | **Richer options:** per-page rotate in Organize; page-number formats ("Page 1 of N", a start number, ranges); watermark position and page range | A7.5, A7.6 | Unit and UI tests |
| B6 | **Command palette** (Ctrl+K), built from the feature registry, not a second list | None | Keyboard only; screen-reader labels |
| B7 | **One result screen** for every tool: download, continue with another tool, start over | B4 | The same component on every tool page |
| B8 | **Skin and visual fixes found during the README work:** the glass skin's header overlaps content at 1440 px; the editor's "Export Page" button is clipped in Bento; the "UNAVAILABLE" badge is misplaced in the glass skin; in editor dark mode the PDF page renders inverted | None | Screenshot tests per skin (Playwright) |

**B1 slices:**

| ID | Scope | Status |
|---|---|---|
| B1.1 | i18n foundation with no new dependency: flat `en`/`ar` catalogs in `src/i18n/locales/`, typed keys, interpolation, the locale in the persisted UI store, a `DocumentLanguage` component syncing `lang`/`dir` on `<html>`, a header language switcher, and the shared shell and tool chrome (Header, Sidebar, Footer, Layout skip link, FileUploadZone, ProcessingState, DownloadState, StepTrack) translated. RTL e2e plus an Arabic axe scan. | DONE, PR #8 merged |
| B1.2a | Catalog metadata: tool names, descriptions and category headings move out of `src/constants/tools.ts` into `src/i18n/locales/catalog.en.ts` / `catalog.ar.ts`, read through `useI18n()` helpers; Home, the bento skin, the Limitations page and the route table use them. The catalog keeps identity and presentation only (id, icon, color, category). | DONE, [PR #9](https://github.com/ahmadmhmdsy/localpdf-studio/pull/9) merged |
| B1.2b | Home page chrome: hero, search placeholder, bento tiles, status-badge labels, quick-pick contexts, privacy block and the unavailable/MVP toasts move to the locale catalogs in every skin. Release-state wording is centralised in `src/i18n/releaseState.ts`. | DONE, [PR #10](https://github.com/ahmadmhmdsy/localpdf-studio/pull/10) merged |
| B1.3a | Tool pages, organize group: `ToolLayout` title/description resolve through the catalogs, and every literal on Merge PDF, Split PDF, Remove pages, Extract pages and Organize PDF (upload zone, steps, buttons, aria labels, toasts, processing and download copy) moves to the locale catalogs. Shared step, upload and file-action copy lives under `tool.common.*`. | DONE, [PR #11](https://github.com/ahmadmhmdsy/localpdf-studio/pull/11) merged |
| B1.3b | Tool pages, optimize group: Compress PDF (preset names and hints from the catalogs), Repair PDF (issue codes from `src/lib/repair.ts` are worded and translated by the page) and OCR PDF (progress, status and summary templates with interpolation), plus Scan to PDF to finish the organize group. | IN REVIEW, [PR #12](https://github.com/ahmadmhmdsy/localpdf-studio/pull/12) |
| B1.3c | Tool pages, convert-to group (JPG, HTML, Word, Excel and PowerPoint to PDF): the same treatment. | READY, after B1.3b |
| B1.3d | Tool pages, remaining groups (convert-from, edit, security, intelligence), one group per PR. | READY, after B1.3c |
| B1.4 | Remaining surfaces: editor, onboarding tour, toasts, settings, error boundaries, Limitations, NotFound. | READY, after B1.2b and B1.3 |
| B1.5 | Feedback loop: a test or lint guard that fails on new user-visible literals in migrated areas, and an Arabic copy review by the owner (native speaker) before release. | READY, after B1.4 |

---

## 4. Phase C: editor depth

| ID | Milestone | Notes |
|---|---|---|
| C1 | Use the PDF.js annotation editor layer for highlight, underline, strikeout, sticky notes and a comments panel | Reuse pdfjs-dist; don't hand-build it |
| C2 | Fill AcroForms (pdf-lib), then a form-field designer: text, checkbox, radio, dropdown, signature | Flatten on export as an option |
| C3 | Bookmark/outline editor, metadata editor, flatten annotations and forms | — |
| C4 | Find and search text in the viewer; page labels | Arabic search needs the B1 RTL work |
| C5 | In-place text editing: start with "replace text in the same font when the glyphs exist" | Needs the PDFium decision (A4.0) |

## 5. Phase D: new tools competitors have

| ID | Tool | Notes |
|---|---|---|
| D1 | PDF → Markdown / Text | pdf.js text extraction; use OCR text when there is no text layer |
| D2 | PDF → HTML | — |
| D3 | Extract images | ZIP output (A7.1 helper) |
| D4 | Compare with a text diff and highlighted changes | Today the compare tool is side-by-side only |
| D5 | PDF/A validation report | veraPDF on desktop only; never claim conformance on the web |
| D6 | Split by bookmarks or by size | Builds on A7.1 |

Each new tool is added through the feature registry and the catalog, with its limits in `src/constants/limits.ts` and its copy in the locale files (B1).

## 6. Phase E: intelligence (opt-in, consent first)

| ID | Milestone | Gate |
|---|---|---|
| E0 | **Decision:** a cloud provider with desktop-held keys, a local WebGPU model, or both | Owner |
| E1 | AI Summarize | Explicit consent each run; disclose what is sent and where; cancellation; size limits; keys never in the web bundle |
| E2 | Translate PDF | Same gate; keep the layout where possible |
| E3 | Chat with PDF | Same gate; no conversation is stored unless the user opts in |

`@google/genai` is already in `package.json` for the disabled AI tools. Review it in E0. Remove it if the local-model route is chosen.

---

## 6.1 Backlog: issues found during past work

| # | Issue | Area | Milestone |
|---|---|---|---|
| 1 | The glass skin header overlaps content at 1440 px | UI | B8 |
| 2 | The editor's "Export Page" button is clipped in the Bento skin | UI | B8 |
| 3 | The "UNAVAILABLE" badge is misplaced in the glass skin | UI | B8 |
| 4 | Editor dark mode renders the PDF page inverted | UI | B8 |
| 5 | The whole UI is English only, and copy is spread across components | i18n | B1 |
| 6 | Catalog descriptions copy iLovePDF wording | Copy | A7.10: DONE, descriptions and the 7 duplicated page intros rewritten |
| 7 | add-page-numbers: the copy promises 9 positions, the UI has 6 | Copy | A7.5: DONE, the 3 middle positions are implemented |
| 8 | The compression production UI path is untested; CMYK, indexed, 16-bit and grayscale images are covered only by unit tests; no real scans; no memory test; no Firefox, Safari or mobile | QA | A2.2 |
| 9 | OCR has no e2e test, and its release checklist is incomplete | QA | A1.3: DONE in PR #6 (`e2e/ocr.spec.ts`). A1.5 still needs the CSP/data-flow audit and real-scan evidence |
| 10 | `npm run lint` reports 123 warnings that predate this work (136 when first logged); reduce them without behavior changes | Code health | Ongoing, a small PR each time |
| 11 | pdf-to-pptx has no theme part and no package-validation test | Office | A6.1 |
| 12 | The `dev` script binds `0.0.0.0`, which exposes the dev server to the local network; consider `localhost` by default with an opt-in flag | Security | Ongoing |
| 13 | The local branches `master`, `feat/tauri-desktop` and the merged `phase-a/*`, `phase-b/*` and `production-readiness/phase-0` branches are left over; check each one is fully merged before deleting it | Repo hygiene | Owner may delete them |
| 14 | `docs/competitive-analysis.md` still described OCR as disabled and said "no code has changed" | Docs | Fixed in this PR |
| 15 | The 31 tool routes in `src/App.tsx` are listed by hand instead of generated from the catalog and registry, so a new tool must be added in several places | Code health | Fixed in PR #6: routes are generated from the catalog and registry; `src/config/toolRoutes.ts` holds only the typed lazy-component map |
| 16 | `AGENTS.md`, `CONTRIBUTING.md` and the PR template disagreed with the code and CI; there were no shared Claude settings, subagents, commands or `docs/environment.md` | Docs, tooling | Fixed in the roadmap PR |
| 17 | Tool pages keep their own intro copy in `ToolLayout`, which duplicates the catalog and drifts from it (A7.10 had to edit 7 pages twice) | Code health | Move the header copy to the catalog/registry read, or to locale files, as part of B1 |
| 18 | `npm run tauri:dev` loaded an unreachable URL: `beforeDevCommand` ran `npm run dev`, whose `--port=3000 --host=0.0.0.0` overrode the Vite config's Tauri port (1420), so the shell asked for 1420 while Vite listened on 3000 | Desktop | Fixed in this PR: `dev:tauri-frontend` lets the Vite config own the host and port when `TAURI_DEV=1` |
| 19 | The desktop shell shows the web data-handling note ("processed in your browser"), which is imprecise inside a Tauri window | Copy | Decide the wording with B1 i18n; the release gate forbids claiming more than is true |
| 20 | No desktop e2e: CI only runs `rustfmt` and `cargo check` for `src-tauri`, with no WebDriver coverage | QA, Desktop | Verified once manually with tauri-driver 2.1.0 and msedgedriver 155 (home, SPA navigation, remove-pages). A repeatable spec needs a driver in CI; ask the owner before adding one |
| 21 | The shared upload zone reports a magic-byte failure with "appears to be corrupted or not a valid PDF" even on image tools | Copy | A7.4 follow-up: make the message name the tool's accepted formats |
| 22 | The upload zone's magic-byte list and each converter's real capability disagree: WebP is accepted at upload and then skipped at conversion | Upload UX | A7.4 follow-up: one source of truth for accepted formats (drop WebP from the accept list, or let the converter report every unsupported file) |
| 23 | CI only triggers for pull requests whose base is `main`, so a stacked PR based on another feature branch stays unchecked until it is retargeted | CI | Workaround used in PR #7 (retarget to `main`); a `pull_request` filter on the working branches, or a documented retarget step in `CONTRIBUTING.md`, would fix it |
| 24 | Sentry is wired in `src/main.tsx`, but the CSP `connect-src` has no Sentry host, so events would be blocked if `VITE_SENTRY_DSN` were set | Privacy, Config | Owner decision first: enabling it sends data off the device and changes the CSP |
| 25 | Unused or duplicate dependencies: `@sentry/tracing` 7.x is unused and mismatched with `@sentry/react` 11.x, `html2canvas` is unused in `src/`, and `@hello-pangea/dnd` and `@dnd-kit` both do drag and drop | Dependencies | Owner approval, then remove in a small PR |
| 26 | The CSP `connect-src` still allows `generativelanguage.googleapis.com` while both AI tools are disabled | Security | Remove or keep with the E0 decision (CSP change, ask first) |
| 27 | Tracked clutter: third-party book PDFs in `input/` (17 MB, a possible copyright problem), `design-preview/`, `audit-evidence/`, old root reports and screenshots | Repo hygiene | Owner decides (§8, item 13); the PDFs stay in git history unless it is rewritten |
| 28 | The full `npm audit` reports 32 vulnerabilities (21 high), all in the dev tree; CI audits production dependencies only, which report 0 | Dependencies | Ongoing, upgrade `@lhci/cli` and friends in a small PR |
| 29 | `npm run test:lhci` fails on Windows: chrome-launcher hits EPERM removing its temp folder, so no local scores are produced. CI on Linux passes | Tooling | Ongoing |
| 30 | The axe e2e run leaves dark-theme color-contrast nodes "incomplete" (12 on home, 11 on merge, 5 on protect), so they need a manual review | Accessibility | B8 or the redesign |

## 6.2 Real-file compression check (2026-10-25, generated PDFs, production build)

| Check | Result |
|---|---|
| A 3-page scan, 5.9 MB → Light 1.62 MB / Balanced 507 KB / Strong 85 KB | PASS |
| Lossless saves nothing on image files (expected) | PASS |
| A text-only 5-page file shrinks 48% on every preset | PASS |
| Page count and text are unchanged; page 1 looks almost identical | PASS |
| PNG alpha (soft mask) is kept | PASS |
| Title and author metadata are stripped | PASS |
| Cancel stops about 0.6 s after the click | PASS |
| The never-larger fallback returns identical bytes and says so | PASS |
| A 101 MB file is refused with a clear message | PASS |
| The production UI path with the tool enabled, real scans, other browsers | SKIPPED: this is A2.2 |

---

## 7. No-hardcoding rule

The app must grow by adding data and configuration, not by editing logic in many places. The binding version of this rule is CLAUDE.md §6a. In short:

| Kind of value | Where it lives |
|---|---|
| A tool's existence, route, category, icon, release state, privacy class, limitation text | `src/constants/tools.ts` and `src/config/featureRegistry.ts`; pages, menus, the command palette and the home grid are generated from these |
| Limits (file size, page count, timeouts, DPI, quality presets) | `src/constants/limits.ts` or a per-tool config module; never inline numbers |
| User-visible text | Locale files once B1 lands; until then, the catalog, the registry or one constants module per page. Never scattered literals for the same message. |
| Colors, spacing, radii, fonts | Theme tokens in `src/theme` (skins); no raw hex values in components |
| URLs, asset paths, hosts | One config module built from `import.meta.env` and `BASE_URL`; no absolute paths; no third-party hosts |
| Feature switches | The feature registry (`releaseState`); no `if (toolId === "...")` checks spread around the code |
| Secrets and keys | Never in source; desktop keystore or environment only |

The rule allows: protocol constants that are fixed by a specification (for example OOXML namespace URIs), test fixtures, and one-off values that are named, used once and explained in a comment.

---

## 8. Decisions waiting on the owner

| # | Decision | Blocks | Recommendation |
|---|---|---|---|
| 1 | ~~Merge PR #2 (compression WS2) and PR #3 (README showcase)~~ | — | Done, both merged |
| 2 | Flip `compress-pdf` to `limited` | A2.3 | After A2.2 passes |
| 3 | Add qpdf WASM | A3 | Approve; Apache-2.0, unblocks four tools |
| 4 | Owner-password-only unlock policy | A3.5 | Only with a clear "you must have the right to do this" notice |
| 5 | Redaction engine | A4, C5 | PDFium, after checking source availability |
| 6 | Camera `Permissions-Policy` | A5.2 | Image fallback first; camera on desktop first |
| 7 | ~~i18n library (a small custom loader vs `i18next`)~~ | — | Done: the small typed custom loader shipped in B1.1, no dependency |
| 8 | AI route (cloud with desktop keys vs a local model) | E | Local model first, if quality is acceptable |
| 9 | Delete the merged local branches | — | Check each is fully merged first (backlog #13) |
| 10 | Pick the redesign world (lead: The Lexicon; competitive: Rail, Contact Sheet, Grounds) | Redesign | The Lexicon, per `docs/design/round2-worlds.md` |
| 11 | `word-to-pdf`, `powerpoint-to-pdf` and `sign-pdf` are `limited` while their text says the "advertised outcome is not achieved"; rule 2 says such tools stay `disabled` | Release gate | Owner chooses: set them to `disabled`, or reword the rule. Any flip needs the owner's OK |
| 12 | Keep `ocr-pdf` at `limited` before the A1.4 and A1.5 evidence exists (flipped 2026-10-24 in commit 2394a74) | A1.5 | Confirm, or return it to `disabled` until the evidence is in |
| 13 | Remove the tracked clutter, starting with the third-party PDFs in `input/` (backlog #27) | Repo hygiene | Remove them; decide separately whether to rewrite history |

## 9. Suggested order

1. ~~Merge PR #2 and PR #3.~~ Done. A1.3 is done (merged in PR #6); A1.4 and A2.2 need real scans from the owner; A1.5 follows them; then the compression flip (owner approval).
2. B1 (i18n and RTL) is under way: B1.1 (the no-dependency foundation plus the shared shell and tool chrome) merged as PR #8, B1.2a (catalog names, descriptions and category headings in the locale files, with an Arabic catalog) merged as PR #9, and B1.2b (home-page chrome) merged as PR #10; B1.3a (organize tool pages) merged as [PR #11](https://github.com/ahmadmhmdsy/localpdf-studio/pull/11); B1.3b (optimize group plus Scan to PDF) is IN REVIEW on `phase-b/tool-pages-2`, and the convert-to and remaining groups (B1.3c, B1.3d) follow. The A7 shallow-tool work merged as PRs #6 (A1.3, A7.1, A7.2, A7.5, A7.7, A7.9, A7.10, backlog #15) and #7 (A7.3, A7.4, A7.6, A6.3); only A7.8 (sign-pdf wording) is ONGOING.
3. Decide on qpdf → A3. Decide on the redaction engine → A4.
4. A5.1, A6.1, and B8 (skin fixes).
5. B2–B7, then Phases C, D and E in order.

## 10. Things you may have missed

Items found during the Phase A work that are easy to lose track of. Each one points to the milestone or decision that owns it.

1. **All Phase A slices so far are merged** (PRs #2, #3, #4, #6 and #7). PR #12 (B1.3b) is the only open slice. A stacked PR gets CI only when its base is `main` (backlog #23).
2. **Compression is not switched on.** It passed on generated files in the production build (§6.2). The real UI has not been checked with real scans, in Firefox, or on mobile (A2.2). The flip to `limited` needs the owner's OK.
3. **OCR's release checklist is incomplete.** The e2e test merged in PR #6 (A1.3); A1.4 (real scans) and A1.5 (CSP/data-flow audit) still need the owner's scans.
4. **Decisions are waiting on the owner** (§8): qpdf, the redaction engine (PDFium vs AGPL MuPDF), the camera policy, the owner-password-only unlock policy, and the AI route.
5. **The UI is still mostly English.** B1.1 (merged) adds the catalogs, the store-backed locale, the header switcher, `dir="rtl"` and the translated shell and tool chrome; B1.2a (merged) moves the tool names, descriptions and category headings into the catalogs, B1.2b (merged) moves the home-page chrome, B1.3a (merged) moves the organize tool pages, and B1.3b (in review) moves the optimize pages and Scan to PDF. The other tool groups, the availability gate, the editor and the tour follow in B1.3c–B1.4, so every new screen must use the catalogs instead of literals.
6. **Tool descriptions no longer copy competitor wording.** A7.10 is done and merged in PR #6.
7. **Known visual bugs** (B8):
   - the glass skin's header overlaps page content;
   - the editor's "Export Page" button is clipped in the Bento skin;
   - the status badge is misplaced in the glass skin;
   - editor dark mode inverts the PDF page itself.
8. **Stale local branches.** `master`, `feat/tauri-desktop` and the merged phase branches are still here. Nothing has been deleted (§8, item 9; backlog #13).
9. **The dev server binds `0.0.0.0`.** It is reachable from other devices on the LAN. Bind to `localhost` by default and make LAN access opt-in through config.
10. **123 lint warnings remain.** They are warnings, not errors, so CI passes. Pay them down in small PRs; don't mix them into feature PRs.
11. **The agent and contributor docs disagreed with the code and with each other** (fixed in this PR, backlog #16):
    - The tool routes were listed by hand in `src/App.tsx`, against the registry-driven rule in CLAUDE.md §6a. They are now generated from the catalog and registry (backlog #15); `AGENTS.md` describes the new entry point.
    - `CONTRIBUTING.md` said to add a Gemini API key to `.env`, but the web build accepts none.
    - `CONTRIBUTING.md` pointed to `TASK.md` and `PLANNING.md` instead of this roadmap.
    - The PR template listed only typecheck, lint, test and build. It now also has `check:bundle`, e2e, the roadmap ID, the release gate and the no-hardcoding check.
