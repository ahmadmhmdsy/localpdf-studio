# LocalPDF Studio Production Readiness Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform LocalPDF Studio from an evaluation build into a reproducible, privacy-accurate, secure, accessible, performant, signed, and release-verified product for the web and supported Tauri platforms.

**Architecture:** Deliver the application through four independently gated surfaces: reproducible foundation, safe web release, signed Windows desktop release, and validated macOS/Linux releases. Security-critical PDF operations move behind typed platform adapters, AI/OCR egress becomes explicit and controlled, and every tool is backed by real output tests rather than success-state mocks.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Zustand, React Router 7, pdf-lib, PDF.js, Tesseract.js, Mammoth, ExcelJS, JSZip, Gemini, Tauri 2/Rust, Vitest, Testing Library, Playwright, GitHub Actions.

---

## 1. Planning stance and release strategy

This is the **master program plan**. Before modifying a workstream, create a child implementation plan for that workstream and break its tasks into 2–5 minute test-first steps. Do not execute every task in one large change.

### Selected sequence: web-first, then Windows, then macOS/Linux

1. **Foundation:** lock dependencies, make every mandatory gate deterministic, and contain unsafe features.
2. **Web production:** fix confidentiality-critical PDF behavior, privacy disclosure, feature truthfulness, performance, and accessibility.
3. **Windows desktop:** validate native storage, save, picker, camera, CSP, permissions, signing, installer, and update behavior.
4. **macOS/Linux desktop:** repeat platform-specific packaging and runtime validation rather than assuming Windows behavior generalizes.

### Approaches considered

| Approach | Decision | Reason |
|---|---|---|
| Fix all 31 tools and platforms in one release | Rejected | It combines security, conversion, native, accessibility, and release risks with no intermediate containment point. |
| Desktop-first | Rejected | Native download, permissions, and packaging defects would obscure the already-broken web/PDF core. |
| Web-first incremental release | **Selected** | Each phase produces a usable, testable product and establishes trustworthy foundations before native distribution. |

### Non-negotiable planning rules

- Do not add new tools while production blockers remain.
- Do not claim a workflow is secure until an independent verifier proves the output.
- Do not claim a file stays local when extracted content or an asset leaves the device.
- Do not ship a tool whose success state can be reached without a valid output.
- Do not ship a desktop artifact that is unsigned.
- Do not release a feature with a known data-loss, confidentiality, or silent-partial-result defect.
- Do not use mocked PDF output as the only evidence for a PDF transformation.
- Preserve the existing React, Zustand, Tauri, and Vitest architecture unless an ADR demonstrates a necessary replacement.

## 2. Release gates

No phase may begin until the previous gate is green in CI and on a clean checkout.

| Gate | Required outcome |
|---|---|
| **G0 — Reproducible source** | `npm ci`, typecheck, lint, unit tests, coverage, web build, Rust formatting/check, and the production npm dependency audit pass from a clean clone. |
| **G1 — Safe web beta** | No no-op or visual-only security feature is reachable; AI egress and OCR network behavior are disclosed and controlled; production-browser E2E and accessibility gates pass. |
| **G2 — Web release candidate** | All published tools have truthful status labels, deterministic tests, performance budgets, security/privacy documentation, and rollback evidence. |
| **G3 — Windows release candidate** | Packaged Tauri workflows pass; capabilities are least-privilege; installer/update artifacts are signed; Windows smoke tests pass. |
| **G4 — Cross-platform GA** | macOS and Linux builds, native permissions, signing/notarization, install/update/uninstall tests, and platform documentation pass. |

## 3. Planned file structure

### Configuration and governance

- Create `src/config/featureRegistry.ts` — supported, limited, disabled, and experimental tool states.
- Create `src/config/featureRegistry.test.ts` — tool IDs, routes, labels, and state validation.
- Create `docs/adr/0001-pdf-security-engine.md` — encryption/decryption engine and threat model.
- Create `docs/adr/0002-ai-key-and-egress-model.md` — browser/desktop key lifecycle and data flow.
- Create `docs/adr/0003-local-ocr-assets.md` — Tesseract asset packaging and licensing.
- Create `docs/adr/0004-web-deployment.md` — static hosting, headers, preview, rollback, and cache policy.
- Create `docs/release/production-checklist.md` — release, signing, rollback, and evidence checklist.
- Create `scripts/verify-release.mjs` — one local command for platform-neutral release checks.

### PDF security boundary

- Create `src/lib/pdf-security/types.ts` — typed operations, options, warnings, and verification results.
- Create `src/lib/pdf-security/engine.ts` — common web/Tauri engine interface.
- Create `src/lib/pdf-security/protect.ts` — password/permission adapter.
- Create `src/lib/pdf-security/decrypt.ts` — authenticated decryption adapter.
- Create `src/lib/pdf-security/object-graph.ts` — reachable-object and page-reference analysis.
- Create `src/lib/pdf-security/redact.ts` — destructive redaction.
- Create `src/lib/pdf-security/verify.ts` — output validation used by tools and integration tests.
- Modify `src/lib/encryption.ts` and `src/lib/security.ts` as compatibility facades.
- Modify `src/lib/pdf.ts` to use graph-safe page composition.

### Privacy, AI, OCR, and camera

- Create `src/lib/ai-key.ts` — asynchronous, platform-aware key resolver.
- Create `src/lib/ai-client.ts` — one Gemini client with timeout, cancellation, retry, and usage limits.
- Create `src/components/privacy/DataEgressNotice.tsx` and its test.
- Create `src/lib/ocr-assets.ts` — local worker/core/language resolution.
- Modify `src/lib/ai.ts`, `src/lib/native.ts`, `src/components/settings/ApiKeySettings.tsx`, `src/pages/tools/AiSummarizer.tsx`, and `src/pages/tools/TranslatePdf.tsx`.

### Native adapter

- Create `src/lib/platform/files.ts` and `files.test.ts` — browser/Tauri open, MIME, and save interface.
- Create `src/lib/platform/runtime.ts` — one runtime capability object.
- Create `src-tauri/capabilities/core.json` — least-privilege application capabilities.
- Modify `src/components/tools/DownloadState.tsx`, `src/lib/native.ts`, `src-tauri/tauri.conf.json`, and `index.html`.

### Editor, persistence, and accessibility

- Create `src/lib/editor-persistence.ts` — versioned records, retention, migration, and deletion.
- Create `src/lib/editor-document.ts` — document lifecycle and resource cleanup.
- Create `src/components/editor/AccessibleDocumentView.tsx`, `src/components/editor/KeyboardAnnotationControls.tsx`, and `src/components/editor/EditorStatusAnnouncer.tsx`.
- Modify `src/contexts/EditorContext.tsx`, `src/store/annotationsStore.ts`, `src/components/editor/Canvas.tsx`, `src/components/editor/AnnotationLayer.tsx`, and `src/components/editor/Toolbar.tsx`.

### End-to-end and release automation

- Create `playwright.config.ts`.
- Create E2E specs for tools, protection/decryption, redaction, AI consent, editor persistence, and packaged desktop workflows.
- Expand `.github/workflows/ci.yml`.
- Create `.github/workflows/desktop.yml`, `.github/workflows/web-deploy.yml`, and `.github/workflows/release.yml` for build matrices, deployment, signing, checksums, and updater manifests.

## 4. Phase 0 — Contain risk and restore a trustworthy baseline

### Task 0.1: Establish the remediation baseline and inventory

**Files:**
- Create: `docs/release/production-inventory.md`
- Reference: `PRODUCTION_READINESS_AUDIT.md`
- Reference: `TASK.md`

- [ ] Create a dedicated remediation branch; do not include unrelated working-tree files.
- [ ] Record the baseline commit, Node version, package versions, artifact names, and gate failures.
- [ ] Classify all 31 tools as `stable`, `limited`, `disabled`, or `experimental`.
- [ ] Assign an owner and acceptance evidence to every limited or disabled tool.
- [ ] Run `git status --short` and confirm only approved plan/evidence files are present.

**Acceptance:** Every public capability has one release state and one evidence requirement.

**Commit:** `docs: establish production remediation inventory`

### Task 0.2: Quarantine tools that currently misrepresent success

**Files:**
- Create: `src/config/featureRegistry.ts` and its test.
- Modify: `src/App.tsx`.
- Modify: Protect, Decrypt, Blackout, Compress, OCR, Scan, Translate, and PDF-to-PPTX pages/tests.

- [ ] Write registry tests requiring `support`, `limitation`, `privacy`, and `releaseState` for every tool.
- [ ] Run `npx vitest run src/config/featureRegistry.test.ts`; expect failure before implementation.
- [ ] Default known unsafe or blocked tools to unavailable in the production web target.
- [ ] Render an honest limitation/remediation message, not a fake uploader or success path.
- [ ] Keep compatibility redirects, but route them to truthful unavailable states.
- [ ] Prove disabled tools cannot enter processing or download success states.
- [ ] Run affected tests and `npm run build`.

**Acceptance:** Production cannot expose a known no-op, visual-only security result, blocked camera/OCR flow, or unsupported conversion as successful.

**Commit:** `feat: gate unsafe tools behind truthful availability states`

### Task 0.3: Repair deterministic installation and Node policy

**Files:**
- Modify: `.npmrc`, `package.json`, `.github/workflows/ci.yml`, `AGENTS.md`, and `README.md`.
- Regenerate: `package-lock.json`.

- [ ] Remove `package-lock=false` from `.npmrc`.
- [ ] Add an explicit Node 22 engine range matching `.nvmrc` and a pinned npm package-manager declaration.
- [ ] Regenerate the complete lockfile with the pinned npm version.
- [ ] Run `npm ci --ignore-scripts --no-audit --no-fund` twice; expected PASS both times.
- [ ] Pin CI to Node 22 and the declared npm version.
- [ ] Document exact clean setup commands.

**Acceptance:** Two consecutive clean installs succeed and CI no longer fails before project scripts.

**Commit:** `build: restore reproducible npm installation`

### Task 0.4: Make typecheck and lint deterministic

**Files:**
- Modify: `tsconfig.json`, `eslint.config.js`, `OnboardingTour.tsx`, `Canvas.tsx`, `SortableThumbnail.tsx`, `ToolErrorBoundary.tsx`, relevant tool catches, and test mocks.

- [ ] Restrict TypeScript to application/test/config roots and exclude `dist`, `coverage`, and `src-tauri/target`.
- [ ] Add the same generated directories to ESLint ignores.
- [ ] Fix declaration order, callback variance, unknown caught values, overrides, and test mock types without weakening compiler settings.
- [ ] Run `npm run typecheck`; expected PASS.
- [ ] Run `npm run lint`; expected PASS with zero errors.
- [ ] Run `npm run tauri:build`, then rerun both checks; expected PASS without generated-output contamination.

**Acceptance:** Typecheck and lint are identical before and after a Tauri build.

**Commit:** `build: make static quality gates deterministic`

### Task 0.5: Stabilize unit and integration tests

**Files:**
- Modify: flaky `src/pages/tools/*.test.tsx` files, `src/tests/utils.tsx`, and `vitest.config.ts`.
- Modify production code only when a failing test proves a real defect.

- [ ] Reproduce each known failure three times and record the failing assertion.
- [ ] Replace arbitrary sleeps with user-visible completion conditions or mocked worker completion.
- [ ] Reset stores, providers, workers, object URLs, and mocks between tests.
- [ ] Run each affected test file three times; expected PASS.
- [ ] Run the full suite three times; expected PASS.
- [ ] Record global and per-workstream coverage from an isolated run.

**Acceptance:** No known test result changes solely because of ordering or load.

**Commit:** `test: remove timing-dependent suite failures`

### Gate G0

Run:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run lint
npm run test:coverage
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
npm run cargo:check
npm audit --omit=dev
```

Expected: PASS. Rust vulnerability audit joins this gate after Task 6.2 configures it.

## 5. Phase 1 — Security-critical PDF workflows

### Task 1.1: Define and prove the PDF security threat model

**Files:**
- Create: `docs/adr/0001-pdf-security-engine.md`.
- Create: `src/tests/fixtures/security/README.md` and encrypted/complex PDF fixtures.

- [ ] Define threats for encryption, decryption, page deletion, redaction, links, forms, annotations, outlines, attachments, metadata, and incremental saves.
- [ ] Build fixtures for unencrypted, user/owner-password, AES/RC4 where supported, linearized, incremental, rotated/CropBox, forms, links, outlines, attachments, and malformed PDFs.
- [ ] Evaluate maintained browser/WASM and Rust engines for license, bundle size, support, memory, timing, and limitations.
- [ ] Select one web engine and optional native adapter; document why pdf-lib cannot remain the security implementation.
- [ ] Reject candidates that cannot prove wrong-password failure and authenticated output.

**Acceptance:** The ADR names engines, unsupported cases, licensing, and independent test oracles.

**Commit:** `docs: define PDF security engine and threat model`

### Task 1.2: Build a typed PDF security adapter

**Files:**
- Create: `src/lib/pdf-security/` modules and adjacent tests.
- Modify: `src/lib/encryption.ts` and `src/lib/security.ts`.

- [ ] Write failing contract tests for protect, decrypt, redact, verify, cancellation, unsupported input, wrong password, and resource-limit errors.
- [ ] Define results that distinguish `success`, `partial`, `unsupported`, `wrong-password`, `cancelled`, and `verification-failed`.
- [ ] Implement the selected web adapter behind the common interface.
- [ ] Keep old imports as compatibility facades.
- [ ] Prevent any adapter from returning success without verification evidence.
- [ ] Run all PDF-security and existing security tests.

**Acceptance:** Callers cannot bypass verification or confuse partial/unsupported with success.

**Commit:** `feat: add verified PDF security engine boundary`

### Task 1.3: Make Protect and Decrypt real operations

**Files:**
- Modify: security adapter, Protect/Decrypt pages, aliases, and tests.

- [ ] Prove protected output contains encryption metadata, rejects the wrong password, and opens with the correct password in an independent reader.
- [ ] Prove decrypt accepts every supported fixture and removes encryption.
- [ ] Reject unsupported algorithms explicitly; never report conversion success.
- [ ] Validate user/owner password distinction and permission behavior.
- [ ] Add cancellation and size/page limits.
- [ ] Show precise unsupported/failure states.

**Acceptance:** A no-encryption output or failed open cannot reach success/download state.

**Commit:** `feat: deliver verified PDF protection and decryption`

### Task 1.4: Implement reachable-object and page-reference analysis

**Files:**
- Create: `src/lib/pdf-security/object-graph.ts` and tests.
- Modify: `src/lib/pdf.ts`.

- [ ] Add fixtures where pages are referenced by annotations, actions, outlines, destinations, forms, or attachments.
- [ ] Traverse security-relevant references from the document catalog.
- [ ] Classify pages as retained, intentionally removed, or reachable orphan.
- [ ] Validate page order as a complete in-range permutation.
- [ ] Normalize CropBox, MediaBox, rotation, and UserUnit through one transform.
- [ ] Reject unrepresentable ranges/coordinates.
- [ ] Add rotated, non-zero CropBox, UserUnit, large-range, and malformed-reference tests.

**Acceptance:** No retained output can reach a removed page through a supported reference type.

**Commit:** `feat: preserve safe PDF page reference graphs`

### Task 1.5: Replace visual redaction with destructive redaction

**Files:**
- Modify: security redaction modules, `Toolbar.tsx`, `BlackoutPdf.tsx`, and tests.

- [ ] Add byte fixtures containing extractable text, images, form values, metadata, links, annotations, and attachments.
- [ ] Define rectangles in normalized page coordinates and map once to PDF space.
- [ ] Remove covered content streams/resources and rebuild the reachable graph.
- [ ] Scrub covered text from content streams, annotations, form fields, metadata, and attachments.
- [ ] Verify with extraction, reachability, image inspection, and an independent parser.
- [ ] Remove editor redaction export until it delegates to the destructive engine.
- [ ] Prevent export while any redaction fails verification.

**Acceptance:** Redacted strings/images are absent from raw output and unreachable through the object graph.

**Commit:** `feat: make PDF redaction destructive and verifiable`

### Task 1.6: Harden merge, extract, split, organize, and remove

**Files:**
- Modify: `src/lib/pdf.ts`, `src/lib/security.ts`, and affected pages/tests.

- [ ] Add fixtures for page order, CropBox/rotation, links, forms, outlines, attachments, and metadata.
- [ ] Rebuild catalog structures explicitly for each operation.
- [ ] Define preserve/convert/warn behavior; never leave stale references silently.
- [ ] Make Split behavior match its displayed output contract.
- [ ] Verify graph safety before Remove Pages reports success.
- [ ] Reject encrypted/corrupt merge inputs with actionable errors.
- [ ] Run page tests and independent fixture validation.

**Acceptance:** Core page workflows preserve valid order and contain no stale references under the documented policy.

**Commit:** `fix: make PDF page workflows graph-safe and truthful`

### Phase 1 security gate

- Independent wrong-password/correct-password verification.
- No-encrypt-dictionary regression test.
- Redacted text absent from raw bytes and extraction.
- Removed pages unreachable from the catalog graph.
- Complex fixture suite passes in supported browsers.
- No visual-only redaction export remains.

## 6. Phase 2 — Privacy, AI, OCR, and camera

### Task 2.1: Publish the data-flow and feature-privacy model

**Files:**
- Create: `docs/privacy/data-flow.md`.
- Modify: feature registry, upload copy, README, and desktop docs.

- [ ] Classify every tool as local-only, optional network, camera, or persistent-storage flow.
- [ ] Identify exactly what text, images, prompts, filenames, settings, and telemetry leave the device.
- [ ] Replace absolute local-only copy with per-tool/per-action disclosure.
- [ ] Test that local tools say local-only and AI/OCR name their external destination.
- [ ] Document retention/deletion for editor history, settings, and AI consent.

**Acceptance:** UI and documentation use the same classification as the implementation.

**Commit:** `docs: make privacy claims match actual data flows`

### Task 2.2: Replace build-time web secrets with a safe key lifecycle

**Files:**
- Create: `docs/adr/0002-ai-key-and-egress-model.md`.
- Create: `src/lib/ai-key.ts` and tests.
- Modify: `src/lib/ai.ts`, `src/lib/native.ts`, `src/components/settings/ApiKeySettings.tsx`, `src/vite-env.d.ts`, `.env.example`, and `README.md`.

- [ ] Document the supported browser/session and desktop OS-credential designs, migration behavior, and rejected storage options in the ADR.
- [ ] Remove `VITE_GEMINI_API_KEY` from production build guidance.
- [ ] Make every AI operation await one platform-aware key resolver.
- [ ] Keep browser keys in memory for the active session unless a separately reviewed persistence design is approved.
- [ ] Store desktop keys in an OS credential store, not settings JSON.
- [ ] Migrate and delete legacy settings keys after secure storage succeeds.
- [ ] Test restart, missing/clear key, platform branching, and concurrent calls.
- [ ] Scan built assets for secret patterns.

**Acceptance:** Web assets contain no shared key; desktop credentials use OS-backed storage; all AI paths share the resolver.

**Commit:** `feat: secure AI key lifecycle across web and desktop`

### Task 2.3: Add consent, cancellation, and bounded Gemini requests

**Files:**
- Create: `DataEgressNotice.tsx` and tests.
- Modify: AI pages, `ai-client.ts`, `ai.ts`, and tests.

- [ ] Prove no request occurs before explicit consent.
- [ ] Show provider, destination, data fields, and cancel action.
- [ ] Add timeout, AbortSignal cancellation, bounded retries, token estimates, and page/character limits.
- [ ] Treat extracted PDF text as quoted untrusted data, not instructions.
- [ ] Default summary download to summary-only.
- [ ] Fail translation visibly on any failed block and identify unsupported glyphs.
- [ ] Bundle language-capable fonts or reject unsupported combinations before processing.
- [ ] Distinguish retryable and terminal errors.

**Acceptance:** No request precedes consent, no partial translation reports complete, and cancellation stops work.

**Commit:** `feat: add consented and bounded AI workflows`

### Task 2.4: Package OCR dependencies locally

**Files:**
- Create: OCR ADR and `src/lib/ocr-assets.ts`.
- Modify: OCR page/tests, Vite/Tauri assets, and add pinned licensed assets.

- [ ] Select worker/core versions and language-data licenses.
- [ ] Package required assets locally and remove runtime CDN dependencies.
- [ ] Add a CSP/network test proving OCR makes no unapproved request.
- [ ] Define page-pixel, language, concurrency, cancellation, and memory limits.
- [ ] Generate and independently validate the text layer.
- [ ] Preserve original rendering if text-layer generation fails.
- [ ] Terminate workers and release canvases on cancel/unmount.

**Acceptance:** OCR runs with network blocked and produces a verified searchable text layer within limits.

**Commit:** `feat: make OCR local, bounded, and verifiable`

### Task 2.5: Repair Scan to PDF and add a non-camera fallback

**Files:**
- Modify: `index.html`, `src-tauri/tauri.conf.json`, `src/pages/tools/ScanToPdf.tsx`, and its tests.

- [ ] Permit camera only on the Scan route or remove the restrictive policy header and enforce route permission in code.
- [ ] Provide image-file upload as a supported fallback.
- [ ] Handle denial, no camera, insecure context, device loss, and interruption distinctly.
- [ ] Stop media tracks on cancel, route exit, and unmount.
- [ ] Validate real Tauri camera permission.
- [ ] Test mocked media permission paths.

**Acceptance:** Supported camera environments scan; denied environments retain image-file workflows; no media track leaks.

**Commit:** `fix: restore camera workflow with safe fallback`

## 7. Phase 3 — Tauri and platform delivery

### Task 3.1: Introduce one typed file/runtime adapter

**Files:**
- Create: `src/lib/platform/files.ts`, `src/lib/platform/files.test.ts`, and `src/lib/platform/runtime.ts`.
- Modify: `src/lib/native.ts`, `src/components/tools/DownloadState.tsx`, and `src/components/tools/FileUploadZone.tsx`.

- [ ] Contract-test browser download, Tauri open/save, drag/drop, MIME inference, and cancellation.
- [ ] Pass bytes directly to native save; remove Blob fetch as a prerequisite.
- [ ] Infer MIME from extension/content when native Files lack `type`.
- [ ] Make web/Tauri behavior converge through one result/error contract.
- [ ] Revoke temporary URLs immediately.
- [ ] Define filename sanitization, overwrite behavior, and atomic-save expectations.

**Acceptance:** Browser and packaged Tauri produce byte-identical output and shared semantics.

**Commit:** `fix: unify browser and Tauri file workflows`

### Task 3.2: Configure least privilege and a real Tauri CSP

**Files:**
- Modify: `index.html`, `src-tauri/tauri.conf.json`, and `src-tauri/capabilities/default.json` only after replacements pass.
- Create: `src-tauri/capabilities/core.json`.

- [ ] Inventory filesystem, shell, store, dialog, notification, asset, and camera permissions.
- [ ] Replace `scope: ["**"]` and home-wide grants with per-operation scopes.
- [ ] Set a non-null Tauri CSP aligned with the frontend policy.
- [ ] Allow only required Gemini/OCR/updater origins and schemes.
- [ ] Remove or self-host Google Fonts.
- [ ] Add tests that fail if broad scopes return.
- [ ] Exercise every command in packaged smoke tests.

**Acceptance:** The app cannot access unrelated home files, shell commands, or remote content outside allowlists.

**Commit:** `security: enforce least-privilege Tauri capabilities`

### Task 3.3: Make Tauri development and packaging cross-platform

**Files:**
- Modify: `package.json`, `tauri.conf.json`, README, and desktop docs.
- Create: `scripts/tauri-build.mjs`.

- [ ] Replace Windows-only wrappers with cross-platform orchestration or documented platform commands.
- [ ] Define one dev-server port and verify Tauri startup.
- [ ] Use a non-`.app` production identifier and platform-appropriate bundle IDs.
- [ ] Validate Windows, macOS, and Linux build commands.
- [ ] Fail clearly when a required toolchain is absent.
- [ ] Document supported OS versions and architectures.

**Acceptance:** The documented command works on each supported host without manual script/port edits.

**Commit:** `build: make Tauri development cross-platform`

### Task 3.4: Add packaged desktop smoke tests

**Files:**
- Create: Windows, macOS, and Linux smoke specs and fixtures.

- [ ] Automate first launch, onboarding, key clear/set/clear, native open/save, drag/drop, camera fallback, file association, and update check.
- [ ] Run against the packaged application, not Vite preview.
- [ ] Verify output bytes/names on every platform.
- [ ] Verify no unexpected requests for local tools.
- [ ] Capture crash logs without document text or secrets.

**Acceptance:** Every supported desktop artifact completes representative workflows from installation.

**Commit:** `test: add packaged desktop smoke coverage`

### Task 3.5: Sign, package, update, and roll back Windows

**Files:**
- Modify: `src-tauri/tauri.conf.json`, `.github/workflows/release.yml`, `README.md`, and `docs/desktop.md`.
- Create: `docs/release/windows-signing.md` and `docs/release/production-checklist.md`.

- [ ] Configure Authenticode for MSI and NSIS with CI secret injection.
- [ ] Publish SHA-256 checksums.
- [ ] Configure signed updater metadata, channels, and rollback.
- [ ] Test clean install, upgrade, blocked downgrade, uninstall, and data-retention decisions.
- [ ] Verify signature/SmartScreen status on a clean account.
- [ ] Fail releases without signatures/checksums.

**Acceptance:** Binaries and updater metadata are signed, checksums are published, and rollback is tested.

**Commit:** `release: sign and automate Windows artifacts`

## 8. Phase 4 — Tool correctness and truthful product scope

### Task 4.1: Make feature support data-driven and tested

**Files:**
- Modify: feature registry, tool cards/routes/pages, docs, and copy tests.

- [ ] Add support state, formats, fidelity, limits, privacy class, and limitations for every tool.
- [ ] Generate card badges and detail disclosures from the registry.
- [ ] Test that “lossless,” “secure,” “all formats,” “local-only,” and “complete” claims match state.
- [ ] Remove placeholder links and add a 404 route.
- [ ] Require registry changes to include tests/docs.

**Acceptance:** UI, docs, tests, and implementation agree for all 31 tools.

**Commit:** `feat: make tool support and limitations truthful`

### Task 4.2: Correct PDF metadata, coordinate, and range behavior

**Files:**
- Modify: `src/lib/pdf.ts`, page-number/crop/rotate/watermark/organize/remove/extract implementations and tests.

- [ ] Define one transform for CropBox/MediaBox/rotation/UserUnit.
- [ ] Cap ranges and document the cap.
- [ ] Align page-number positions with implemented options.
- [ ] Define metadata preservation during rotate/crop/merge.
- [ ] Validate reorder arrays as complete permutations.
- [ ] Add round-trip rotated/non-zero-origin fixtures.

**Acceptance:** Transformations round-trip within defined tolerances across supported page geometries.

**Commit:** `fix: normalize PDF geometry and page operations`

### Task 4.3: Implement measurable compression or disable it

**Files:**
- Modify: `compress.ts`, Compress page, and tests.

- [ ] Build scanned/text/mixed/already-optimized fixture corpus.
- [ ] Define target dimensions, DPI, JPEG/WebP quality, and reporting.
- [ ] Implement real recompression with before/after bytes and quality warnings.
- [ ] Warn/fail visibly when output grows.
- [ ] Remove the tool if a safe browser implementation cannot meet the promise.

**Acceptance:** Levels cause measured, explainable changes; fake identical levels are removed.

**Commit:** `fix: implement measurable PDF compression`

### Task 4.4: Align Repair and PDF/A with verified outcomes

**Files:**
- Modify: repair/PDF-A modules, pages/tests, and feature registry.

- [ ] Repair only recoverable PDFs; otherwise return unchanged/failure, never an error-text placeholder.
- [ ] Validate PDF/A with an independent verifier or label it metadata-only.
- [ ] Add malformed, partial, and object-stream fixtures.

**Acceptance:** No placeholder is called repair and no output is called PDF/A without conformance evidence.

**Commit:** `fix: align PDF repair and PDF/A with verified outcomes`

### Task 4.5: Define a safe Office conversion scope

**Files:**
- Modify: Office libraries, pages/tests, and feature registry.

- [ ] Reject `.doc`, `.xls`, and `.ppt` unless a licensed converter is selected.
- [ ] Label current conversions best-effort.
- [ ] Preserve supported text/tables/images/headers/formulas explicitly and list omissions.
- [ ] Add horizontal/vertical pagination for wide Excel sheets.
- [ ] Add real generated Office fixtures.
- [ ] Define size and cancellation limits.

**Acceptance:** Accepted formats work, unsupported formats fail before upload, and limitations are visible.

**Commit:** `fix: narrow and harden Office conversion claims`

### Task 4.6: Repair PDF-to-PowerPoint packaging

**Files:**
- Modify: `pdf-to-pptx.ts` and tests.
- Add independent PPTX validation/rendering script.

- [ ] Match extension, content type, relationship, and actual image bytes.
- [ ] Generate valid presentation/master/layout/theme/content-type/relationship parts.
- [ ] Open output in an independent OOXML consumer and render it.
- [ ] Define sizing, aspect ratio, DPI, order, and large-document limits.
- [ ] Re-enable only after structural and visual checks pass.

**Acceptance:** Independent OOXML validation and rendering succeed for supported fixtures.

**Commit:** `fix: produce valid PDF-to-PowerPoint packages`

### Task 4.7: Harden image and HTML conversion

**Files:**
- Modify: image/HTML libraries, pages, and tests.

- [ ] Normalize EXIF orientation and accept declared browser-decodable formats.
- [ ] Convert pixels to PDF points at documented DPI.
- [ ] Paginate long/wide HTML with explicit size, margins, orientation, and print CSS.
- [ ] Do not fetch remote subresources unless disclosed/allowed.
- [ ] Enforce pixel, DOM, page, output, memory, and cancellation limits.

**Acceptance:** Images have valid PDF dimensions and HTML is paginated and bounded.

**Commit:** `fix: harden image and HTML PDF generation`

## 9. Phase 5 — Editor performance, data lifecycle, and accessibility

### Task 5.1: Scope editor state to editor routes

**Files:**
- Create: `src/lib/editor-document.ts` and its tests.
- Modify: `src/App.tsx`, `src/contexts/EditorContext.tsx`, `src/store/documentStore.ts`, editor imports, and tests.

- [ ] Define one document lifecycle that owns PDF.js tasks, pdf-lib documents, parsed pages, annotations, and cleanup.
- [ ] Mount editor restore/provider logic only on editor routes.
- [ ] Defer pdf-lib parsing until export or a feature needing it.
- [ ] Use granular selectors instead of whole-store context rerenders.
- [ ] Measure route navigation and initial tool load before/after.

**Acceptance:** Home/tool routes do not parse or render the editor document graph.

**Commit:** `perf: isolate editor state to editor routes`

### Task 5.2: Add versioned, user-controlled persistence and deletion

**Files:**
- Create: `editor-persistence.ts` and tests.
- Modify: `EditorContext.tsx`, `annotationsStore.ts`, and settings/editor UI.

- [ ] Define a versioned schema and forward-migration policy.
- [ ] Persist metadata/annotations by default; opt in for full document bytes/history.
- [ ] Add retention limits, timestamps, storage usage, and “clear all editor data.”
- [ ] Cancel stale restores when a newer document opens.
- [ ] Release PDF.js/pdf-lib resources on replace/close/clear/unmount.
- [ ] Delete old records after migration/clear.

**Acceptance:** Users can understand, disable, and delete persisted data; stale restore cannot overwrite the active document.

**Commit:** `feat: add versioned user-controlled editor persistence`

### Task 5.3: Commit history once per annotation gesture

**Files:**
- Modify: `annotationsStore.ts`, annotation layer/items, and tests.

- [ ] Add begin/update/commit/cancel gesture APIs.
- [ ] Create one undo snapshot at gesture start and commit once at completion.
- [ ] Debounce persistence without storing every pointer event.
- [ ] Cancel on pointer cancel, unmount, tool change, and document replacement.
- [ ] Prove one gesture equals one undo step.

**Acceptance:** One completed gesture creates one history entry and one final persistence write.

**Commit:** `perf: batch annotation history and persistence`

### Task 5.4: Bound rendering and virtualize large documents

**Files:**
- Modify: `Canvas.tsx`, thumbnail/sidebar components, and tests.

- [ ] Cap DPR and canvas pixels with a documented formula.
- [ ] Lazy-render offscreen pages and release distant canvases.
- [ ] Virtualize thumbnails by visible range.
- [ ] Define page/memory thresholds and degraded mode.
- [ ] Add 100/500-page performance tests.

**Acceptance:** Memory and canvas allocation stay within budgets for supported maximums.

**Commit:** `perf: bound editor rendering for large PDFs`

### Task 5.5: Reduce initial and tool-specific bundles

**Files:**
- Modify: `App.tsx`, `vite.config.ts`, AI settings/editor exports, and bundle-budget tests.

- [ ] Remove editor/provider code from non-editor static graph.
- [ ] Dynamically import AI, Office, jsPDF, html2canvas, and export-only libraries.
- [ ] Stop manual chunks from forcing AI/pdf-lib into initial preloads.
- [ ] Define raw/gzip budgets for initial and lazy bundles.
- [ ] Fail CI on unbudgeted regression.

**Acceptance:** Initial JavaScript excludes AI/editor/export-only code and meets budget.

**Commit:** `perf: reduce initial and per-tool bundle cost`

### Task 5.6: Add an accessible document representation

**Files:**
- Create: `AccessibleDocumentView.tsx` and `EditorStatusAnnouncer.tsx`.
- Modify: `Canvas.tsx`, editor page, and tests.

- [ ] Expose title, page count, current page, and semantic page navigation.
- [ ] Provide extracted text by page in a reading mode.
- [ ] Associate canvas with a concise label and document view.
- [ ] Announce page changes, failures, and annotation actions.
- [ ] Test keyboard and desktop/mobile screen readers.

**Acceptance:** A nonvisual user can identify, navigate, read, and understand annotation state.

**Commit:** `feat: add accessible PDF document navigation`

### Task 5.7: Provide keyboard equivalents for pointer-only tools

**Files:**
- Create: `KeyboardAnnotationControls.tsx`.
- Modify: annotation layer/items, toolbar, tests, and shortcut docs.

- [ ] Add named focusable handles and instructions.
- [ ] Support arrow movement, Shift+arrow resize, and explicit modes.
- [ ] Support keyboard placement/drawing.
- [ ] Announce changes and undo/redo.
- [ ] Preserve pointer interactions.
- [ ] Add automated keyboard tests and manual screen-reader verification.

**Acceptance:** Core annotation lifecycle can be completed without a pointer.

**Commit:** `feat: add keyboard-complete PDF annotation tools`

### Task 5.8: Complete forms, dialogs, focus, contrast, and mobile semantics

**Files:**
- Modify shared upload/form/modal/drawer/button/logo/status components, `src/index.css`, and tests.

- [ ] Associate labels, descriptions, validation, and errors.
- [ ] Expose selection with radio/pressed semantics.
- [ ] Complete modal/drawer focus trap, Escape, inertness, and opener restoration.
- [ ] Name the mobile logo link.
- [ ] Fix AA contrast in both themes.
- [ ] Add non-pointer zoom/pan alternatives.
- [ ] Add a catch-all 404 with heading, message, and navigation.
- [ ] Run axe and manual WCAG 2.2 A/AA checks.

**Acceptance:** Axe has zero serious/critical issues and manual testing finds no core blocker.

**Commit:** `fix: complete core accessibility and responsive semantics`

## 10. Phase 6 — CI, security, and release engineering

### Task 6.1: Complete the source CI gate

**Files:**
- Modify: `.github/workflows/ci.yml`, `scripts/verify-release.mjs`, and `package.json`.

- [ ] Run install, typecheck, lint, tests, coverage, build, and browser tests on Node 22.
- [ ] Add a second clean-install job.
- [ ] Rerun static checks after Tauri target generation.
- [ ] Add secret scanning for source, fixtures, and built assets.
- [ ] Publish test, coverage, bundle, and accessibility artifacts.
- [ ] Make every gate required with no release `continue-on-error`.

**Acceptance:** A clean checkout passes every source gate with auditable artifacts.

**Commit:** `ci: enforce production source gates`

### Task 6.2: Add dependency, Rust, SBOM, and license policy

**Files:**
- Modify: CI/release workflows.
- Create: dependency-policy and license documentation.

- [ ] Upgrade `sharp` to the patched release and test generated images.
- [ ] Configure `cargo-audit` and fail on unaccepted advisories.
- [ ] Generate npm/Cargo SBOMs.
- [ ] Record licenses for PDF/Office/OCR/font/security engines.
- [ ] Define vulnerability SLAs and exception expiry.
- [ ] Run npm and Rust audits in CI.

**Acceptance:** Every release has current audits, SBOM, and accepted licenses.

**Commit:** `security: automate dependency and license governance`

### Task 6.3: Add security-focused integration tests

**Files:**
- Create: `e2e/security/protect-decrypt.spec.ts`, `e2e/security/redaction.spec.ts`, `e2e/privacy/ai-consent.spec.ts`, `e2e/editor/persistence.spec.ts`, and `e2e/security/local-network-isolation.spec.ts`.
- Add security fixtures and independent verification scripts under `scripts/verify/` and `src/tests/fixtures/security/`.

- [ ] Test upload → protect → wrong/correct password → download → decrypt.
- [ ] Test blackout with extractable secrets and inbound links.
- [ ] Test Remove Pages with links/forms/outlines to removed content.
- [ ] Test AI refusal, cancellation, key clear, and zero-request local tools.
- [ ] Test editor restore/clear/replacement/undo.
- [ ] Test OCR and camera fallback with network blocked.
- [ ] Retain fixture hashes for reproducibility.

**Acceptance:** Security E2E tests fail on the audited behavior and pass only after verified fixes.

**Commit:** `test: add security and privacy integration gates`

### Task 6.4: Automate the desktop build matrix

**Files:**
- Create: `.github/workflows/desktop.yml` and update Tauri config/docs.

- [ ] Build Tauri on Windows, macOS, and Linux with declared toolchains.
- [ ] Run Rust format/check/clippy/test/audit before packaging.
- [ ] Run packaged smoke tests on available runners.
- [ ] Publish unsigned test artifacts only from non-release branches.
- [ ] Restrict production credentials to protected release environments.

**Acceptance:** Every supported OS/architecture builds and passes automated package smoke tests.

**Commit:** `ci: add cross-platform Tauri build matrix`

### Task 6.5: Complete signing, updater, rollback, and release evidence

**Files:**
- Modify: Tauri config and release workflow.
- Create: production checklist and platform signing documentation.

- [ ] Sign Windows binaries; sign/notarize macOS; configure Linux package/repository trust.
- [ ] Sign updater artifacts and metadata.
- [ ] Publish checksums, SBOMs, licenses, provenance, and release notes.
- [ ] Test install, upgrade, failed update, rollback, and uninstall.
- [ ] Define data retention/deletion during uninstall/rollback.
- [ ] Require human approval after automated gates.

**Acceptance:** A clean machine can verify, install, update, and recover using published artifacts.

**Commit:** `release: automate verified signed distribution`

### Task 6.6: Reconcile documentation with shipped behavior

**Files:**
- Modify: `README.md`, `docs/desktop.md`, `TASK.md`.
- Create/update privacy, security, accessibility, format, and troubleshooting docs.

- [ ] Remove unsupported no-upload, secure-store, all-format, lossless, privacy, signing, and platform claims.
- [ ] Document exact OS/browser versions, formats, limits, privacy flows, retention, and limitations.
- [ ] Add accessibility support and known limitations.
- [ ] Add security/redaction/encryption caveats.
- [ ] Link the audit and release checklist.

**Acceptance:** Every user-facing claim maps to a passing test or documented limitation.

**Commit:** `docs: align product guidance with production behavior`

### Task 6.7: Automate web deployment and rollback

**Files:**
- Create: `docs/adr/0004-web-deployment.md`.
- Create: `docs/release/web-deployment.md`.
- Create: `.github/workflows/web-deploy.yml`.
- Modify: `vite.config.ts`, `index.html`, and the selected static-host configuration.

- [ ] Select a static host that supports protected environments, atomic deployments, preview URLs, custom security headers, and immediate rollback.
- [ ] Define cache policy for hashed assets, `index.html`, service worker files if any, CSP, Permissions-Policy, and other security headers.
- [ ] Deploy every release candidate to a preview URL and run smoke/E2E tests against that exact build.
- [ ] Restrict production deployment credentials to protected release tags/environments.
- [ ] Publish immutable build provenance and a machine-readable release manifest.
- [ ] Test promotion, failed deployment, cache invalidation, and rollback to the previous known-good artifact.
- [ ] Confirm deployment logs and analytics never contain uploaded document data, extracted text, API keys, or filenames unless explicitly required and disclosed.

**Acceptance:** A tested web artifact can be promoted and rolled back atomically with correct headers and without exposing document data.

**Commit:** `release: automate verified web deployment and rollback`

## 11. Phase 7 — macOS and Linux hardening

### Task 7.1: Validate macOS packaging and permissions

**Files:**
- Modify: Tauri/Rust macOS configuration and smoke tests.
- Create: `docs/release/macos.md`.

- [ ] Validate supported Intel/Apple Silicon targets.
- [ ] Configure bundle ID, icons, category, entitlements, camera description, and hardened runtime.
- [ ] Sign/notarize app and updater.
- [ ] Test install, launch, Gatekeeper, camera, update, and uninstall.
- [ ] Confirm file access stays within user-selected locations.

**Acceptance:** A clean Mac installs and completes smoke workflows without quarantine/permission failures.

**Commit:** `release: harden macOS packaging and permissions`

### Task 7.2: Validate Linux packaging and integration

**Files:**
- Modify: Linux Tauri configuration/scripts and smoke tests.
- Create: `docs/release/linux.md`.

- [ ] Validate AppImage and chosen deb/rpm package on supported distributions.
- [ ] Set category, MIME associations, icons, and WebKit expectations.
- [ ] Test dialogs, drag/drop, camera/fallback, settings, updates, and uninstall.
- [ ] Distinguish tested distributions from best-effort support.

**Acceptance:** Supported distributions install and complete representative desktop workflows.

**Commit:** `release: add supported Linux desktop validation`

## 12. Final verification and release evidence

### Task 8.1: Run full local release verification

```sh
npm ci
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm run test:e2e
npm run verify:bundles
npm run verify:security
npm run verify:a11y
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo audit --file src-tauri/Cargo.lock
npm audit
```

Expected: PASS for every applicable command. Platform checks run on their platform runner rather than being marked skipped in release evidence.

### Task 8.2: Execute independent release sign-off

**Files:**
- Reference: `docs/release/production-checklist.md` and `PRODUCTION_READINESS_AUDIT.md`.

- [ ] Attach G0–G4 evidence to the candidate.
- [ ] Confirm formerly blocked tools are fixed/enabled or truthfully unavailable.
- [ ] Confirm no unaccepted high/critical advisory or unsigned required artifact.
- [ ] Confirm privacy, security, accessibility, support, and rollback docs match the candidate.
- [ ] Obtain engineering, product, security/privacy, and release-owner approval.
- [ ] Create tags/artifacts only after explicit human authorization.

**Acceptance:** The signed release candidate is reproducible, independently verified, documented, and reversible.

## 13. Critical path and parallel work

### Critical path

`0.3 → 0.4 → 0.5 → Phase 1 security → Phase 2 privacy → Phase 3 Windows → Phase 6 release`

### Safe parallel tracks after G0

- PDF fixtures/ADR may run with UI copy and CI work.
- Performance profiling may run with correctness fixes; persistence waits for lifecycle design.
- Accessibility forms may run with canvas virtualization.
- Windows packaging starts after CSP/capabilities and file adapters pass.
- macOS/Linux packaging starts after cross-platform Tauri scripts pass.

### Conflicting ownership

- One owner handles lockfile, CI, and dependency version changes.
- One PDF-security owner controls the engine and redaction/removal interfaces.
- One owner controls IndexedDB schema and migration.
- Tauri capabilities and native commands are tested and changed together.
- Feature state, UI, docs, and tests change in the same commit.

## 14. Required evidence for every completed task

- Test-first failure captured before implementation.
- Focused and affected suites pass afterward.
- Typecheck and lint pass.
- Real output fixtures validate output-changing work.
- UI changes test loading, empty, error, cancellation, retry, and success.
- Core interaction changes receive keyboard/screen-reader testing.
- Network/storage changes receive privacy review.
- Tauri changes receive permission review.
- Performance work includes before/after measurements.
- Documentation and feature state match behavior.
- No secret, real user document, generated target output, or unrelated file enters the diff.
- Each commit contains one coherent workstream.

## 15. Recommended staffing and execution

Suggested ownership:

- **Foundation:** developer/tooling owner.
- **PDF security:** PDF/security owner plus independent fixture reviewer.
- **Privacy/AI/OCR:** privacy and document-processing owner.
- **Tauri:** desktop/Rust owner.
- **Conversions:** feature/conversion owner.
- **Editor/a11y:** frontend performance/accessibility owner.
- **Release:** QA/release owner; security/privacy reviewer signs sensitive workflows.

Execution order:

1. Complete G0 before feature implementation.
2. Deliver web security/privacy before re-enabling tools.
3. Produce a web RC before calling desktop work complete.
4. Sign Windows before making macOS/Linux release claims.
5. Run cross-platform GA only with platform-specific permission/update evidence.

## 16. Plan self-review result

- **Audit coverage:** Every P0 blocker and high-priority finding maps to a phase/task and gate.
- **Type consistency:** The plan uses one security engine, AI key resolver, file/runtime adapter, feature registry, and persistence boundary.
- **Scope:** The master is split into independently executable workstreams; child plans are created before implementation.
- **Placeholder scan:** No unresolved implementation placeholder remains. Evidence-dependent architecture choices are explicit ADR tasks with acceptance criteria.
- **Safety:** No sensitive workflow, public release, or signing operation is approved before independent verification.
