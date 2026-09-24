# LocalPDF Studio — Production Readiness Audit

**Audit date:** 2026-09-24  
**Revision:** `feat/tauri-desktop` at `8f9f63b`  
**Environment:** Windows 11 x64; Node `v24.18.0`, npm `11.18.0`, rustc `1.98.0`  
**Scope:** Web and Tauri product behavior, functionality, data integrity, security/privacy, accessibility/UX, performance/architecture, tests, dependencies, documentation, CI/CD, packaging, and representative user workflows.  
**Change boundary:** No application source was changed. Generated `dist/`, coverage output, Rust target output, and this audit report were refreshed/created.

## Executive decision

# **NO-GO for production release**

LocalPDF Studio is a useful **local PDF utility demo** and it can perform a meaningful subset of basic browser operations. It is **not production-ready** and should not be published as a reliable 31-tool private suite, used for sensitive/legal documents, or distributed as a trusted desktop application in its current state.

### Decision by surface

| Surface | Decision | Reason |
|---|---|---|
| Public web production | **NO-GO** | Clean install/CI is broken; mandatory type/lint gates fail; privacy claims are false for AI; redaction/protection/decryption have confidentiality/correctness failures; camera and OCR workflows are blocked or high-risk. |
| Public Windows desktop | **NO-GO** | Tauri bundle builds, but installers are unsigned; the save path depends on CSP-blocked `blob:` fetch; permissions are broad; native MIME/picker behavior is incomplete. |
| macOS/Linux desktop | **UNVERIFIED / NO-GO** | Documentation claims support, but the tested scripts are Windows-specific and no macOS/Linux build or runtime smoke evidence exists. |
| Internal demo with synthetic, non-sensitive PDFs | **CONDITIONAL GO** | Basic merge, page selection, rotation, comparison, rendering, and simple XLSX conversion worked in the production browser build. Do not use AI, OCR, Scan to PDF, signing, blackout/redaction, protection, or decryption for sensitive workflows. |
| Regulated/security-sensitive use | **PROHIBITED** | Current redaction, encryption, secret storage, data-egress disclosure, and retention controls are not sufficient. |

## What is genuinely usable

These are meaningful positives, not release approval:

- All 31 declared tool routes, both compatibility redirects, and the editor route rendered in the production build without page/console errors during the route sweep.
- A production-browser merge of two synthetic three-page PDFs reached the success/download state; a direct library probe produced six pages as expected.
- A minimal valid XLSX converted successfully to PDF in the production browser.
- The Vite web build, Rust `cargo check`, and Windows Tauri release build completed.
- The final isolated coverage run passed all 615 tests. Coverage was approximately **52.82% overall** and **89.26% statements in `src/lib`**.
- Page-range parsing rejects empty, inverted, multi-dash, and out-of-bounds ranges; page deletion avoids invalid descending-index behavior.
- Tool pages generally expose upload/processing/success/error states, lazy routes, and per-tool error boundaries.
- The main uploader applies a 100 MiB per-file cap and checks PDF magic bytes.
- AI summaries are rendered as React text rather than unsafe HTML; the HTML preview sink uses DOMPurify.
- The desktop home page had no automated axe violations after onboarding dismissal. Mobile had no horizontal overflow at 390 CSS pixels.

## Fresh validation results

| Check | Result | Evidence |
|---|---|---|
| `npm ci --dry-run --ignore-scripts --no-audit --no-fund` | **FAIL** | `EUSAGE`: `package.json` and `package-lock.json` are out of sync; Tauri packages, React types, Sharp and platform packages are missing from the lock. |
| `npm run typecheck` | **FAIL** | Clean-tree run found source errors in Canvas, SortableThumbnail, tool catches, ToolErrorBoundary, and security test mocks. After a Tauri build, `allowJs` also scans generated `src-tauri/target` JS and becomes state-dependent. |
| `npm run lint` | **FAIL** | Clean-tree run: 1 error and 213 warnings; `OnboardingTour.tsx:71` uses `handleComplete` before declaration. After Tauri build: generated target assets raise the run to 64 errors and 210 warnings because they are not ignored. |
| `npm test` / coverage | **FLAKY** | Runs varied between 615/615 passing and 1–2 failures under load; failures moved between timing-sensitive component tests. Final isolated coverage run passed 79 files/615 tests. |
| `npm run test:coverage` | **PASS** | 79 files, 615 tests; overall statements 52.82%; `src/lib` statements 89.26%, branches 77.10%, functions 93.61%, lines 89.69%. |
| `npm run build` | **PASS with warnings** | Production web build succeeded; multiple chunks exceeded 800 KiB. |
| `npm run cargo:check` | **PASS** | Rust code checked successfully. |
| `npm run tauri:build` | **PASS on Windows** | Produced MSI and NSIS artifacts. Build warned that bundle identifier ends in `.app`, which is discouraged on macOS. |
| Windows installer signatures | **FAIL** | Both MSI and NSIS report Authenticode `NotSigned`. |
| `npm audit --json` | **FAIL** | One high advisory in direct dev dependency `sharp 0.35.3`; fix available in `0.35.4`. |
| `npm audit --omit=dev --json` | **PASS** | No known production npm vulnerabilities reported. |
| Rust vulnerability audit | **SKIPPED** | `cargo-audit` is not installed; Rust vulnerability status is unknown. |
| Production browser route sweep | **PASS with defects** | 31 tools, editor, and two aliases rendered; unknown route renders a blank document with no main/H1. |
| Camera workflow | **FAIL** | Production browser displayed “Camera access denied or not available.” |
| CSP blob fetch probe | **FAIL** | `fetch(blob:)` was rejected with `TypeError: Failed to fetch`; Tauri `DownloadState` depends on this operation. |
| Home accessibility | **PARTIAL PASS** | Desktop axe: 0 violations, 10 contrast checks incomplete. Mobile axe: one serious unnamed-link violation. |
| Packaged Tauri interactive smoke | **NOT RUN** | Installer execution, native picker/save/settings, camera, file association and updater flows were not interactively exercised. |
| macOS/Linux packaging | **NOT RUN** | No supported-host build matrix or artifacts. |

## P0 production blockers

### 1. Clean checkout cannot install or run CI

**Evidence**

- `package.json:62-69,75-76,82` declares Tauri packages, React types and Sharp.
- `package-lock.json` does not contain those root dependencies.
- `.npmrc:2` sets `package-lock=false`.
- `.github/workflows/ci.yml:21` runs `npm ci`.

**Impact**

CI fails before typecheck/test/build. A developer cannot rely on the committed lockfile to reproduce the audited environment.

**Required fix**

Regenerate and commit a complete lockfile, remove the lockfile-disable setting, and prove `npm ci` in a clean clone before any other release work is considered.

### 2. “Protect PDF” is a no-op and reports success

**Evidence**

- `src/lib/encryption.ts:24-38` passes unsupported password/encryption options to `pdf-lib`.
- A fresh runtime probe protected a one-page PDF with user and owner passwords. Output size was unchanged, the output contained **no `/Encrypt` dictionary**, and it loaded without a password.
- `src/pages/tools/ProtectPdf.tsx:54-60,271-278` still reports success.

**Impact**

Users may hand a supposedly protected document to someone while it remains completely unencrypted. Permissions provide no protection if the file is not encrypted.

### 3. Decryption cannot reliably open encrypted PDFs

**Evidence**

- `unlockPdf` calls `PDFDocument.load(..., { password })`; installed `pdf-lib 1.17.1` does not support encrypted-PDF loading or saving.
- Independent runtime probing found genuinely encrypted input fails before decryption.

**Impact**

The advertised Decrypt PDF outcome is not achieved for the files it is meant to handle.

### 4. Redaction is not a trustworthy confidentiality boundary

There are two distinct failures:

1. **Editor redaction is explicitly visual-only.** `src/components/editor/Toolbar.tsx:99-107,183-207,281-291` draws rectangles over copied content and warns that underlying content is not removed. The output can look redacted while text remains extractable.
2. **Dedicated Blackout can retain an original redacted page through inbound references.** `src/lib/security.ts:124-136` copies unaffected page nodes but does not remap annotations, links, outlines or other destinations. A specialist runtime reproduction retained the original redacted page as a reachable orphan when another page linked to it.

**Impact**

This is a critical confidentiality defect. No output from either redaction path should be represented as permanently redacted until the complete reachable PDF object graph is scrubbed and independently verified.

### 5. Native Tauri downloads depend on a CSP-blocked operation

**Evidence**

- `src/components/tools/DownloadState.tsx:30-40` fetches generated Blob URLs before native save.
- `index.html:12` `connect-src` does not include `blob:`.
- A production-browser CSP probe returned `TypeError: Failed to fetch` for `fetch(blob:)`.

**Impact**

The Tauri native-save path for DownloadState-based tools is high-confidence broken unless WebView-specific behavior differs. It must be smoke-tested in the packaged app and fixed by passing bytes directly or explicitly allowing the required scheme.

### 6. Privacy and secret-handling claims contradict behavior

**Evidence**

- `src/components/tools/FileUploadZone.tsx:288-320` always says “Files never leave your device,” including AI pages.
- `src/lib/ai.ts:124-196` sends extracted PDF text/chunks to Gemini.
- `src/pages/tools/AiSummarizer.tsx:21-45` starts processing immediately after selection, without a consent step.
- `README.md:3,27-28` and `src-tauri/tauri.conf.json:46-50` claim no uploads/no servers.
- `src/lib/native.ts:127-180` stores a desktop Gemini key in a normal settings store, while `docs/desktop.md:83-96` calls it secure.
- A scan of 62 built JS assets found **no current live Google API key pattern**. This does not remove the architectural risk: any `VITE_GEMINI_API_KEY` configured for a web build is extractable from client JavaScript.

**Impact**

Users can unknowingly disclose document text. A shared web key can be extracted and abused for billable requests. Desktop users may believe a plaintext-like settings file is an OS credential vault.

### 7. Scan to PDF is blocked by shipped policy

**Evidence**

- `index.html:16` sets `Permissions-Policy: camera=()`.
- `ScanToPdf.tsx:24-40` immediately calls `getUserMedia`.
- The production browser displayed “Camera access denied or not available.”

There is no image-file fallback. The desktop package also lacks a verified camera permission/capability workflow.

### 8. Mandatory quality gates are not green or deterministic

A production branch cannot be approved with failing typecheck/lint and intermittent tests. Even when tests pass, mocked tests missed the confirmed encryption no-op and the CSP/camera/product-integrity failures.

### 9. Desktop artifacts are unsigned and the release pipeline is incomplete

Fresh Windows artifacts were produced, but both are `NotSigned`. There is no automated signing/notarization, updater, checksum publication, rollback, or release workflow. Public desktop distribution is blocked even apart from application defects.

## High-priority correctness and product gaps

### PDF object integrity

- `copyPages`-based merge/extract/reorder/redaction operations do not rebuild and remap the full document object graph. AcroForms, outlines, tags, page labels, attachments, links and metadata can be lost or left pointing at orphan source pages.
- Remove Pages unlinks the visible page node but does not guarantee that removed confidential content is unreachable through links, forms or other references.
- Coordinate handling mixes PDF.js CropBox/rotation rendering with pdf-lib MediaBox/origin assumptions, so annotations can be misplaced on non-zero CropBox, rotated or UserUnit pages.
- Reordering accepts arbitrary arrays rather than validating a complete permutation.
- Large ranges have no iteration cap.

### Conversions and media

- PDF-to-PPTX declares PNG while embedding JPEG bytes and constructs incomplete slide-master/layout relationships; outputs are structurally suspect and should be validated by a real OOXML consumer.
- Legacy `.doc`, `.xls`, and `.ppt` are advertised but not parsed by Mammoth/ExcelJS/JSZip.
- Office conversions discard formatting, images, tables, headers, formulas and layout fidelity. Wide Excel sheets are not horizontally paginated.
- Compression levels only change yielding/progress behavior; embedded images and content are not recompressed.
- PDF/A only adds best-effort metadata/OutputIntent and is not conformant.
- HTML-to-PDF renders one raster page for the full content and does not correctly paginate/orient long or wide HTML.
- Image inputs are limited by pixel type and MIME inconsistently. Native picked Files may have no MIME. Photo pixels are treated as PDF points, producing nonstandard page sizes.
- Repair can return a placeholder PDF containing parser error text when recovery fails; it does not recover the original content.

### Editor and persistence

- The editor is globally mounted and restores large PDF buffers/history on non-editor routes.
- The same file is parsed with PDF.js and pdf-lib during view/restore, and full buffers/history are written to IndexedDB.
- Annotation pointer movement creates history and persistence work continuously instead of committing once per gesture.
- Page thumbnails are not virtualized; high zoom can allocate very large canvas backing stores.
- Replacing/closing a document does not comprehensively clear annotations/history or destroy old PDF resources.
- Sensitive file buffers and up to 50 history states persist without expiry, user-facing retention controls, or encryption.
- Default annotation colors may not survive export color parsing, and editor redaction is not secure redaction.

### AI

- Translate PDF bypasses the desktop key resolver and uses only `VITE_GEMINI_API_KEY`.
- Saved desktop keys are not reliably hydrated after restart for synchronous AI paths.
- Translation makes one request per approximate line group, truncates input/output, can silently skip failed blocks and still report completion.
- Helvetica cannot encode several advertised CJK/Arabic/Hindi targets.
- AI summary download includes the full extracted source text by default, which can leak the document when a user shares the “summary.”
- Raw PDF text is interpolated into model instructions without a robust untrusted-data boundary; prompt injection can affect model output.
- There are no cancellation, aggregate token/cost, timeout or user-consent controls.

### OCR

Tesseract defaults to remote worker/core/language assets, while the shipped CSP does not allow those origins. OCR therefore has a high-confidence CSP conflict and a third-party executable/training-data supply-chain dependency. Even when operational, the implementation renders pages at 2× and adds low-opacity text, which is not equivalent to a robust Unicode text layer.

## 31-tool outcome matrix

Legend: **OK** = reliable narrow implemented outcome; **Limited** = usable with material caveats; **Blocked/Misleading** = advertised outcome is not reliably achieved.

| Tool | Assessment | Audit conclusion |
|---|---|---|
| Merge PDF | **OK narrow** | Basic local page merge works; complex catalog/reference preservation is not guaranteed. |
| Split PDF | **Limited** | Produces one extracted PDF, not a set of independent files as users may expect. |
| Remove Pages | **Limited** | Visible pages are removed, but deleted objects may remain reachable. |
| Extract Pages | **Limited** | Basic extraction works; references/forms/catalog structures may be lost. |
| Organize PDF | **Limited** | Basic editor organization works; skin-dependent routes and DnD/resource limits apply. |
| Scan to PDF | **Blocked** | Camera denied by shipped policy; no upload fallback. |
| Compress PDF | **Blocked/Misleading** | No real image/content recompression; levels can produce identical output. |
| Repair PDF | **Limited** | Parse/resave only; unrecoverable files become error-text placeholders. |
| OCR PDF | **Blocked/High risk** | CSP/CDN conflict; limited invisible text layer and high memory use. |
| JPG to PDF | **OK web / Limited Tauri** | Browser images work; native MIME loss can skip files; page sizing is poor. |
| HTML to PDF | **Limited** | Single rasterized result, no URL fetching, weak pagination/orientation. |
| Word to PDF | **Blocked/Misleading** | `.doc` advertised but unsupported; DOCX output loses structure and styling. |
| Excel to PDF | **Limited** | Minimal XLSX works; `.xls`/CSV claims and fidelity/horizontal pagination are incomplete. |
| PowerPoint to PDF | **Blocked/Misleading** | `.ppt` advertised but unsupported; PPTX becomes lossy regex-extracted text. |
| PDF to JPG | **OK narrow** | Page rendering and ZIP output are coherent, subject to memory limits. |
| PDF to PDF/A | **Blocked as conformance** | Best-effort metadata only; UI warns it is not conformant. |
| PDF to Word | **Limited** | Approximate plain paragraphs, not layout-faithful editable conversion. |
| PDF to Excel | **Limited** | Heuristic table extraction; no guarantee of complete/correct data. |
| PDF to PowerPoint | **Blocked** | Image-slide package uses mismatched media types and incomplete OOXML structure. |
| Rotate PDF | **OK narrow** | Valid fixed-angle page rotation works. |
| Add Page Numbers | **Limited** | Basic placement works; implementation has six positions while catalog text says nine. |
| Add Watermark | **Limited** | Fixed text style only; some UI wording overstates image/custom behavior. |
| Crop PDF | **OK with caveat** | One normalized crop is applied to all pages. |
| Edit PDF | **Limited** | Adds overlays; does not edit existing PDF text/layout. |
| Sign PDF | **Blocked/Misleading** | Visual image stamp, not certificate-backed or tamper-evident signing. |
| Blackout PDF | **Blocked** | Editor path is visual-only; dedicated path has conditional retained-reference risk. |
| Compare PDF | **OK narrow** | Honest side-by-side visual comparison; no automatic diff. |
| Decrypt PDF | **Blocked** | Current pdf-lib path cannot load genuinely encrypted PDFs. |
| Protect PDF | **Blocked** | Runtime probe proves output is not encrypted. |
| AI Summarizer | **Limited/High risk** | Requires Gemini, sends text without informed consent, has key/persistence issues. |
| Translate PDF | **Blocked/High risk** | Key resolver bypass, truncation, unsupported fonts, partial-success semantics. |

## Accessibility and UX

### High-priority accessibility failures

- The editor renders PDF content to an unnamed canvas with no structured text/document alternative. Nonvisual users cannot read or navigate the document.
- Annotation placement, move, resize and draw interactions are pointer-only across editor, blackout, sign and edit tools.
- Several form labels are not programmatically associated, errors are not connected with `aria-describedby`, and visual selection state is not exposed through pressed/radio semantics.
- Some modal/drawer focus behavior is incomplete; background content is not consistently inert and opener focus/Escape handling varies.
- Mobile home has an unnamed logo link (serious axe `link-name` violation).
- The editor suppresses native touch gestures with `touchAction: none` without an equivalent robust control set.
- Light-skin gradient and secondary-text tokens have calculated contrast ratios below WCAG AA in multiple locations.
- Unknown routes render a blank page with no main landmark, heading, message, or recovery action.
- Status/progress announcements and error focus are inconsistent.
- Several Bento/sidebar links are dead or placeholder `href="#"` controls.

### UX positives

- Semantic page language, skip link, header/main/footer landmarks, global focus-visible styling and reduced-motion CSS exist.
- Most icon-only header/editor controls have accessible names.
- File upload has keyboard-selectable controls and a Tauri picker fallback.
- ConfirmModal and onboarding include dialog semantics/focus handling.
- Merge exposes move-up/down keyboard alternatives; editor sorting includes a keyboard sensor.

## Performance and architecture

### Confirmed characteristics

- Production `dist/index.html` eagerly preloads the 468 KiB main bundle, 51 KiB core, 1,003 KiB pdf-lib/PDF.js chunk and 289 KiB AI chunk. The initial static JavaScript graph is about **1.81 MiB before gzip**, excluding the 1.26 MiB PDF worker asset.
- Large lazy chunks include `office-parsers` at 1.82 MiB (508 KiB gzip), `pdf-lib` at 1.00 MiB (351 KiB gzip), jsPDF at 390 KiB, AI at 289 KiB and html2canvas at 202 KiB.
- The editor and AI settings graph are statically reachable even on non-editor routes.
- Global restore parses persisted documents on Home/tool routes.
- Blackout repeats a full-source PDF.js parse per redacted page.
- Annotation gestures trigger history/IndexedDB writes at event rate.
- All editor thumbnails mount; there is no virtualization.
- No aggregate file/page/pixel/output budget or cancellation exists for long-running work.
- Blob URLs are often revoked only on reset, not route unmount.

### Performance positives

- Tool pages are lazy and wrapped with error boundaries.
- PDF.js worker setup is explicit.
- Render tasks and Tesseract workers have cleanup paths.
- Tauri plugins are conditionally/dynamically imported.

## Security and privacy assessment

### High-risk areas

- Visual-only editor redaction and conditional dedicated-redaction retention.
- Plain/unsupported PDF protection and decryption.
- Undisclosed Gemini text egress under absolute local-only claims.
- Bundle-visible API-key architecture and plaintext-like desktop key storage.
- Broad Tauri filesystem, shell-open, notification, asset and store capabilities; Tauri-configured CSP is `null`.
- Indefinite IndexedDB retention of file and annotation history.
- External OCR worker/core/language assets conflicting with CSP and local-only claims.
- No production crash reporting/metrics; errors are often console-only.
- Per-file 100 MiB limit but no aggregate resource limits.

### Positive controls

- No unsanitized AI-summary HTML sink was found.
- DOMPurify protects the discovered HTML preview sink.
- The meta CSP omits `unsafe-eval`, denies framing, restricts base/form actions and uses a same-origin default.
- Ordinary logging is development-gated.
- No password logging or raw-PDF upload endpoint was found.
- No current live Gemini key pattern was found in the built assets.

## Build, dependency and release assessment

- `.nvmrc` requests Node 22; audit ran on Node 24; `package.json` has no `engines` or `packageManager` declaration.
- `npm outdated` shows substantial major-version drift, including Google GenAI, Vite, Vitest, ESLint, TypeScript, Tesseract and React. Blind upgrades are not recommended, but a support/update policy is needed.
- CI covers only Ubuntu/Node 22 web checks. It has no Rust locked check, Tauri build, E2E, coverage, audit, secret scan, artifact smoke, signing, notarization, updater or deployment checks.
- The Tauri bundle identifier warning and Windows-only wrapper conflict with the cross-platform documentation.
- The dev URL contract is ambiguous: Tauri config expects port 1420 while the npm dev script forces port 3000.
- External Google Fonts are requested but blocked by the CSP.
- Public desktop release needs immutable action provenance, checksums, signing/notarization, updater testing and rollback.

## Minimum remediation plan

### P0 — before any release candidate

1. **Restore reproducibility**
   - Commit a synchronized lockfile.
   - Remove `package-lock=false`.
   - Prove `npm ci`, typecheck, lint, tests, coverage, web build and locked Cargo checks from a clean clone.
   - Exclude `src-tauri/target` and generated output from TypeScript/ESLint.

2. **Correct security-critical PDF behavior**
   - Replace encryption with a maintained password-aware implementation.
   - Verify protection with independent readers and wrong-password tests.
   - Implement decrypt against genuinely encrypted fixtures.
   - Remove/disable insecure editor redaction export.
   - Rebuild page graphs with complete page-reference remapping and scrub links/actions/outlines/forms/attachments.
   - Add byte/object-graph redaction and deleted-page reachability tests.

3. **Fix Tauri delivery/security**
   - Pass bytes directly to native save or allow/test Blob access.
   - Narrow filesystem/asset/shell/store capabilities and set a non-null Tauri CSP.
   - Fix native MIME inference, picker/download parity, drag/drop and camera permissions.
   - Add packaged-app workflow tests on every supported OS.

4. **Correct privacy and key architecture**
   - Replace absolute no-upload claims with accurate per-tool disclosure.
   - Require informed consent before extracted text is sent.
   - Use one async Tauri-aware key resolver in all AI paths.
   - Use OS credential storage or a backend proxy; never describe a normal settings file as secure.
   - Default summary export to summary-only.

5. **Make release gates deterministic**
   - Fix all current type/lint errors and reduce/enforce warnings.
   - Eliminate flaky timing-sensitive tests.
   - Add real integration/E2E tests for upload → process → download, editor persistence/clear, AI consent/key, OCR/CSP, redaction, encryption and Tauri bridge flows.

### P1 — feature truthfulness and reliability

6. Fix or remove blocked/misleading tools: OCR, compression, PDF/A, legacy Office formats, Protect/Decrypt, signing claims, and PDF-to-PPTX packaging.
7. Add aggregate file/page/pixel/output budgets, cancellation, worker cleanup and URL lifecycle management.
8. Lazy-route the editor/provider, defer export-only pdf-lib parsing, batch annotation commits, use granular store selectors, virtualize thumbnails and cap canvas pixels.
9. Add an accessible document/text alternative and keyboard equivalents for all pointer-only operations.
10. Add 404 recovery, consistent form/error semantics, focus management and verified contrast.

### P2 — release engineering

11. Establish OS/architecture build matrices, code signing, notarization, checksums, updater/rollback and deployment smoke tests.
12. Add npm/Cargo/secret vulnerability policy, performance budgets and release diagnostics that do not expose document data.
13. Reconcile documentation with actual behavior and remove unsupported “100% local,” “all 31 unchanged,” “secure store,” and signed-installer claims.

## Release acceptance criteria

A future release should be considered only when all of the following are evidenced:

- Fresh-clone install and every mandatory gate pass twice, including after a Tauri build.
- Redaction, page deletion, protection and decryption pass independent byte/object-graph and interoperability tests.
- No sensitive workflow relies on a visual-only, no-op or unsupported implementation.
- AI egress is consented, accurately disclosed and controlled; keys are not shared secrets embedded in a public bundle.
- Packaged Tauri picker, camera, Blob/native save, settings, file opening and downloads pass on supported OS/architecture targets.
- OCR workers/assets are local or explicitly allowlisted and CSP-tested.
- Web and desktop installers are signed/notarized as applicable, with checksums and tested update/rollback.
- Real E2E tests cover representative success, failure, cancellation, reload and data-deletion paths.
- WCAG 2.2 A/AA issues affecting core tasks are remediated and manually keyboard/screen-reader tested.
- Documentation exactly matches supported formats, privacy behavior, platform support and limitations.

## Audit limitations

- This was a static plus local runtime review, not a penetration test.
- No real user documents were uploaded to AI or external services.
- No macOS/Linux build was attempted.
- The packaged Tauri UI was not interactively smoke-tested on Windows; installer signatures and bundle generation were verified.
- `cargo-audit` was unavailable, so Rust CVEs are unknown.
- No external Gemini call was made, so provider retention behavior and live model availability were not tested.
- Automated accessibility testing does not replace screen-reader and manual keyboard testing.
- Performance findings include measured bundle sizes and source-derived calculations; no 100 MiB stress profile was executed.
- Independent specialist runtime probes supplied the conditional redaction/object-graph and encrypted-PDF evidence cited above.

## Final answer

**Can the app be used?** Yes, for a narrow set of non-sensitive local PDF operations in the web build.  
**Does it reliably achieve its claimed goal?** No. It does not yet provide 31 dependable tools, true no-upload behavior, secure redaction/protection/decryption, accessible core editing, reproducible CI, or a release-ready cross-platform desktop product.

**Production verdict: NO-GO.**