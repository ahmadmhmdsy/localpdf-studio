# LocalPDF Studio — Fix Plan & Milestones

> Generated from comprehensive code review. Each task is self-contained and suitable for a single sub-agent.
> Tasks within a milestone can run in parallel unless marked with a dependency.

---

## Milestone 1: Security & Data Integrity (CRITICAL)

**Goal:** Fix or remove features that silently fail or create false security expectations.

### Task 1.1 — Fix or Remove `protectPdf()` Encryption
**Priority:** P0 | **Effort:** Medium | **Depends on:** None

**Problem:** `protectPdf()` in `src/lib/encryption.ts` passes `userPassword`/`ownerPassword` to `pdf.save()`, but the output has no `/Encrypt` dictionary. Users believe their PDF is protected when it isn't.

**Files to modify:**
- `src/lib/encryption.ts` — fix the encryption implementation
- `src/lib/encryption.test.ts` — add test that verifies `/Encrypt` dictionary exists in output
- `src/pages/tools/ProtectPdf.tsx` — update UI if behavior changes

**Acceptance criteria:**
**
1. `protectPdf(file, 'pass123', 'ownerPass')` produces a PDF that requires a password to open
2. The output PDF contains an `/Encrypt` dictionary (verify with a hex dump or pdf-lib inspection)
3. `unlockPdf()` can successfully decrypt the output
4. Test: load the output with `PDFDocument.load(arrayBuffer, { password: 'pass123' })` succeeds
5. Test: load without password throws an error

**Investigation steps:**
1. Check pdf-lib version and its encryption API — `save({ userPassword, ownerPassword })` should work
2. Verify the `permissions` object format matches pdf-lib's expected `PDFPermissions` type
3. If pdf-lib's encryption is broken, consider using a different approach (e.g., `pdf-lib`'s `PDFDocument.load` with `save` and encryption options, or a wrapper library)

**Fallback:** If encryption cannot be made to work reliably, remove the tool from the UI and mark it as "coming soon" in the feature registry.

---

### Task 1.2 — Fix `unlockPdf()` Decryption
**Priority:** P0 | **Effort:** Small | **Depends on:** Task 1.1

**Problem:** `unlockPdf()` fails on genuinely encrypted PDFs.

**Files to modify:**
- `src/lib/encryption.ts`
- `src/lib/encryption.test.ts`

**Acceptance criteria:**
**
1. `unlockPdf(file, 'correctPassword')` produces a valid unprotected PDF
2. The output opens without a password
3. Test with a known-encrypted PDF fixture

---

### Task 1.3 — Fix `pdf-to-pptx.ts` MIME Mismatch & Missing Parts
**Priority:** P0 | **Effort:** Medium | **Depends on:** None

**Problem:** PPTX declares PNG content type but embeds JPEG bytes. Missing slide master/layout parts.

**Files to modify:**
- `src/lib/pdf-to-pptx.ts`
- `src/lib/pdf-to-pptx.test.ts`

**Acceptance criteria:**
**
1. All embedded images match their declared content type (either all PNG or all JPEG)
2. PPTX contains valid `ppt/slideMaster/slideMaster1.xml` and `ppt/slideLayout/slideLayout1.xml`
3. `[Content_Types].xml` overrides match actual file content types
4. Output opens in PowerPoint/LibreOffice without repair prompts
5. Test: unzip the output and verify all referenced files exist

**Implementation notes:**
- Option A: Change `getPdfPageThumbnails` to return PNG (use `canvas.toDataURL('image/png')`)
- Option B: Change PPTX to declare JPEG content type and use `.jpg` extensions
- Add minimal slide master and layout XML parts (can be boilerplate)

---

### Task 1.4 — Add Consent Flow for AI Tools
**Priority:** P1 | **Effort:** Medium | **Depends on:** None

**Problem:** AI Summarizer and Translate send text to Gemini without explicit consent. Download includes full source text.

**Files to modify:**
- `src/pages/tools/AiSummarizer.tsx` — add consent checkbox before processing
- `src/pages/tools/TranslatePdf.tsx` — add consent checkbox before processing
- `src/components/privacy/DataEgressNotice.tsx` — enhance with explicit consent language
- `src/config/featureRegistry.ts` — update privacy notices

**Acceptance criteria:**
**
1. Before any API call, user sees a clear dialog: "This will send your document text to Google Gemini. Continue?"
2. Consent is required (checkbox or button) before processing starts
3. Download does NOT include full source text by default (add a separate "Download full text" option)
4. Consent state is not persisted (must be given each session)

---

### Task 1.5 — Fix `withRetry()` Error Classification
**Priority:** P1 | **Effort:** Small | **Depends on:** None

**Problem:** `withRetry()` retries all errors, including permanent ones (invalid API key, malformed request).

**Files to modify:**
- `src/lib/ai.ts`
- `src/lib/ai.test.ts`

**Acceptance criteria:**
**
1. HTTP 4xx errors (except 429) are NOT retried — fail immediately
2. HTTP 429 (rate limit) IS retried with backoff
3. HTTP 5xx errors ARE retried with backoff
4. Network errors (fetch throws) ARE retried
5. Test: mock a 400 response, verify only 1 attempt is made
6. Test: mock a 429 response, verify 3 attempts are made

**Implementation notes:**
- Check `error.status` or `error.code` from the Gemini SDK
- Create a `isRetryableError(error): boolean` helper
- Only retry when `isRetryableError` returns true

---

### Task 1.6 — Harden `sanitizeFilename()`
**Priority:** P2 | **Effort:** Small | **Depends on:** None

**Problem:** `sanitizeFilename()` doesn't handle `..`, reserved Windows names, or Unicode attacks.

**Files to modify:**
- `src/lib/utils.ts`
- `src/lib/utils.test.ts`

**Acceptance criteria:**
**
1. `..\..\etc/passwd` → `passwd` (no path traversal)
2. `CON.pdf` → `CON_.pdf` (reserved Windows name)
3. Control characters (0x00-0x1F) are stripped
4. Test cases for all above scenarios

---

## Milestone 2: Broken & Misleading Features (HIGH)

**Goal:** Fix features that are enabled but produce incorrect or misleading results.

### Task 2.1 — Fix `compressPdf()` to Actually Compress
**Priority:** P0 | **Effort:** Large | **Depends on:** None

**Problem:** Compression levels only change `objectsPerTick` (yielding), not actual compression.

**Files to modify:**
- `src/lib/compress.ts`
- `src/lib/compress.test.ts`
- `src/pages/tools/CompressPdf.tsx` — update UI copy

**Acceptance criteria:**
**
1. `high` level produces a smaller file than `low` for a PDF with unoptimized streams
2. `high` level attempts image recompression (or at minimum, uses `useObjectStreams: true` + `objectsPerTick: 50`)
3. The UI honestly states what compression can and cannot do
4. Test: compress a known PDF, verify output size differs by level

**Implementation notes:**
- pdf-lib cannot recompress images. Options:
  - A) Use `pdf-lib` for object stream packing only, and document the limitation clearly
  - B) Add `sharp` (already a devDependency) for image extraction + recompression
  - C) Use a different library like `pdfjs-dist` to render and re-embed
- Minimum viable: make `useObjectStreams` conditional on level, and add `updateMetadata: false` for `high`

---

### Task 2.2 — Fix `translatePdf()` Font Support for CJK/Arabic
**Priority:** P1 | **Effort:** Large | **Depends on:** None

**Problem:** Helvetica can't encode CJK/Arabic/Hindi characters.

**Files to modify:**
- `src/pages/tools/TranslatePdf.tsx`
- `src/lib/ai.ts` — `translatePdf()` function
- `src/lib/ai.test.ts`

**Acceptance criteria:**
**
1. Translations to Chinese, Japanese, Korean, Arabic, Hindi render correctly
2. A font with broad Unicode support is embedded (e.g., Noto Sans, or system font)
3. Test: translate a PDF to Chinese, verify the output contains valid CJK characters

**Implementation notes:**
- pdf-lib supports embedding custom fonts via `pdf.embedFont(fontBytes)`
- Need a font with CJK support (Noto Sans CJK is ~16MB, may be too large)
- Alternative: use `pdf-lib`'s `StandardFonts` for Latin scripts and warn users about CJK limitations
- Alternative: render translated text as an overlay image (using canvas) instead of embedded text

---

### Task 2.3 — Fix `convertWordToPdf()` to Preserve Structure
**Priority:** P1 | **Effort:** Large | **Depends on:** None

**Problem:** Strips all HTML tags, producing plain-text PDF.

**Files to modify:**
- `src/lib/office-word.ts`
- `src/lib/office-word.test.ts`

**Acceptance criteria:**
**
1. Output PDF preserves headings, bold, italic, lists, and images from the DOCX
2. Uses `jsPDF` + `html2canvas` (already in dependencies) to render HTML to PDF
3. Test: convert a DOCX with headings and images, verify they appear in output

**Implementation notes:**
- `html2canvas` and `jspdf` are already in `package.json`
- Render the HTML from mammoth into a hidden DOM element, capture with html2canvas, add to jsPDF
- Handle pagination by splitting canvas across pages

---

### Task 2.4 — Fix `convertPowerpointToPdf()` XML Parsing
**Priority:** P2 | **Effort:** Medium | **Depends on:** None

**Problem:** Regex-based XML parsing is fragile.

**Files to modify:**
- `src/lib/office-pptx.ts`
- `src/lib/office-pptx.test.ts`

**Acceptance criteria:**
**
1. Uses a proper XML parser (e.g., `DOMParser` or `fast-xml-parser`) instead of regex
2. Handles nested shapes, groups, and text boxes
3. Test: convert a PPTX with nested shapes, verify all text appears

---

### Task 2.5 — Fix `addPageNumbers()` Position Count
**Priority:** P2 | **Depends on:** None

**Problem:** UI says 9 positions, only 6 implemented.

**Files to modify:**
- `src/lib/pdf.ts` — `addPageNumbers()`
- `src/constants/tools.ts` — update description
- `src/pages/tools/AddPageNumbers.tsx` — update UI

**Acceptance criteria:**
**
1. Either implement all 9 positions (add top-center, middle-left, middle-right, bottom-center) OR update the description to say 6
2. UI matches implementation

---

### Task 2.6 — Fix `signPdf()` to Be Tamper-Evident (or Rename)
**Priority:** P2 | **Effort:** Large | **Depends on:** None

**Problem:** "Sign PDF" is just an image stamp, not a cryptographic signature.

**Files to modify:**
- `src/pages/tools/SignPdf.tsx` — rename to "Stamp PDF" or add disclaimer
- `src/constants/tools.ts` — update description
- `src/config/featureRegistry.ts` — update limitation text

**Acceptance criteria:**
**
1. UI clearly states this is a visual stamp, not a cryptographic signature
2. Description says "Add a visual signature image" not "Sign PDF"

---

## Milestone 3: Code Quality & Performance (MEDIUM)

**Goal:** Improve maintainability, performance, and user experience.

### Task 3.1 — Deduplicate `StoreLike` Interface
**Priority:** P3 | **Effort:** Small | **Depends on:** None

**Files to modify:**
- `src/lib/native.ts`

**Acceptance criteria:**
 1. `StoreLike` defined once at module level, used by all three functions

---

### Task 3.2 — Fix `AnnotationLayer` to Use Granular Store Hooks
**Priority:** P2 | **Effends on:** None

**Problem:** Uses deprecated `useEditor()` hook, causing unnecessary re-renders.

**Files to modify:**
- `src/components/editor/AnnotationLayer.tsx`

**Acceptance criteria:**
 1. Uses `useDocumentStore`, `useToolsStore`, `useAnnotationsStore` directly
2. No `useEditor()` import

---

### Task 3.3 — Fix `Editor.tsx` Keyboard Shortcut Re-Creation
**Priority:** P2 | **Effort:** Small | **Depends on:** None

**Problem:** `useMemo` depends on `pages`, causing shortcuts to re-create on every page change.

**Files to modify:**
- `src/pages/Editor.tsx`

**Acceptance criteria:** 1. Use refs for `pages` and `zoom` in the dependency array
2. Or use `useKeyboardShortcuts` with a ref-based approach

---

### Task 3.4 — Fix Theme Flash on First Paint
**Priority:** P3 | **Effort:** Small | **Depends on:** None

**Problem:** `initialPrefs` is always `{}`, causing wrong theme until `hydrate()` completes.

**Files to modify:**
- `src/store/toolsStore.ts`
- `src/main.tsx` or `src/App.tsx` — call `hydrate()` before render

**Acceptance criteria:** 1. Theme is correct on first paint, no flash of wrong theme

---

### Task 3.5 — Fix Dark Mode in Canvas
**Priority:** P2 | **Effort:** Medium | **Depends on:** None

**Problem:** Dark mode uses `filter: invert(1) hue-rotate(180deg)` which inverts PDF content.

**Files to modify:**
- `src/components/editor/Canvas.tsx`

**Acceptance criteria:** 1. Dark mode changes UI chrome (background, toolbar) without inverting PDF content
2. Or: apply a proper dark theme that doesn't invert the document

---

### Task 3.6 — Add Memory Management for Large PDFs
**Priority:** P2 | **Effort:** Medium | **Depends on:** None

**Problem:** `pdfToJpgs` and `getPdfPageThumbnails` render all pages without memory management.

**Files to modify:**
- `src/lib/image.ts`

**Acceptance criteria:** 1. Pages are processed in batches (e.g., 10 at a time)
2. Canvas elements are released after use (`canvas.width = 0; canvas.height = 0`)
3. For `getPdfPageThumbnails`, consider adding a `maxPages` option or streaming approach

---

### Task 3.7 — Fix `ProcessingState` Generic Steps
**Priority:** P3 | **Effort:** Small | **Depends on:** None

**Problem:** All tools show the same 3 generic steps.

**Files to modify:**
- `src/components/tools/ProcessingState.tsx`

**Acceptance criteria:** 1. Accept a `steps` prop to customize the step labels per tool
2. Default to current generic steps if not provided

---

### Task 3.8 — Fix `FileUploadZone` Magic Bytes for Non-PDF
**Priority:** P3 | **Effort:** Small | **Depends on:** None

**Problem:** Only validates PDF magic bytes, skips validation for other file types.

**Files to modify:**
- `src/components/tools/FileUploadZone.tsx`

**Acceptance criteria:** 1. Validates magic bytes for ZIP-based formats (DOCX, XLSX, PPTX — check for `PK\x03\x04`)
2. Validates image magic bytes (JPEG: `\xFF\xD8\xFF`, PNG: `\x89PNG`)

---

## Milestone 4: Testing & Validation (HIGH)

**Goal:** Add integration tests that catch the classes of bugs found in this review.

### Task 4.1 — Add Integration Test for `protectPdf()`
**Priority:** P0 | **Effort:** Small | **Depends on:** Task 1.1

**Files to create:**
- `src/lib/encryption.integration.test.ts`

**Acceptance criteria:** 1. Creates a PDF, protects it with a password
2. Verifies the output has an `/Encrypt` dictionary
3. Verifies the output cannot be loaded without a password
4. Verifies the output can be loaded with the correct password

---

### Task 4.2 — Add Integration Test for `mergePdfs()`
**Priority:** P1 | **Effort:** Small | **Depends on:** None

**Files to create:**
- `src/lib/pdf.integration.test.ts`

**Acceptance criteria:** 1. Creates two single-page PDFs
2. Merges them
3. Verifies the output has 2 pages
4. Verifies page content is preserved

---

### Task 4.3 — Add Integration Test for `compressPdf()`
**Priority:** P1 | **Effort:** Small | **Depends on:** Task 2.1

**Acceptance criteria:** 1. Creates a PDF with known content
2. Compresses at `low` and `high` levels
3. Verifies both outputs are valid PDFs
4. Verifies size difference (if any) is documented

---

### Task 4.4 — Add Integration Test for `pdf-to-pptx`
**Priority:** P1 | **Effort:** Small | **Depends on:** Task 1.3

**Acceptance criteria:** 1. Converts a single-page PDF to PPTX
2. Unzips the output
3. Verifies all referenced files exist
4. Verifies content types match actual file types

---

### Task 4.5 — Add Validation Script for Feature Registry
**Priority:** P2 | **Effort:** Small | **Depends on:** None

**Files to create:**
- `scripts/validate-feature-registry.ts`

**Acceptance criteria:** 1. Reads `featureRegistry.ts`
2. For each `disabled` tool, verifies the UI shows an "unavailable" message
3. For each `limited` tool, verifies the limitation text is displayed
4. Outputs a report of mismatches

---

## Milestone 5: Documentation & Communication (MEDIUM)

**Goal:** Ensure users understand what each tool can and cannot do.

### Task 5.1 — Update Tool Descriptions to Match Reality
**Priority:** P2 | **Effort:** Medium | **Depends on:** All fix tasks

**Files to modify:**
- `src/constants/tools.ts` — update all descriptions
- `src/config/featureRegistry.ts` — update all limitation texts

**Acceptance criteria:** 1. Every tool description accurately reflects what the tool does
2. No tool claims capabilities it doesn't have
3. Limitations are clearly stated

---

### Task 5.2 — Create User-Facing "Known Limitations" Page
**Priority:** P3 | **Effort:** Small | **Depends on:** Task 5.1

**Files to create:**
- `src/pages/Limitations.tsx` — new page
- `src/App.tsx` — add route

**Acceptance criteria:** 1. Lists all tools with their current limitations
2. Explains what's being worked on
3. Links to GitHub issues where applicable

---

## Execution Order & Parallelization

### Wave 1 (Parallel — no dependencies):
- Task 1.1: Fix `protectPdf()`
- Task 1.3: Fix `pdf-to-pptx.ts`
- Task 1.4: Add AI consent flow
- Task 1.5: Fix `withRetry()`
- Task 1.6: Harden `sanitizeFilename()`
- Task 2.1: Fix `compressPdf()`
- Task 3.1: Deduplicate `StoreLike`
- Task 3.2: Fix `AnnotationLayer` hooks
- Task 3.3: Fix keyboard shortcuts
- Task 3.4: Fix theme flash
- Task 3.7: Fix `ProcessingState` steps
- Task 3.8: Fix magic bytes validation

### Wave 2 (Depends on Wave 1):
- Task 1.2: Fix `unlockPdf()` (depends on 1.1)
- Task 2.2: Fix `translatePdf()` font support
- Task 2.3: Fix `convertWordToPdf()`
- Task 2.4: Fix `convertPowerpointToPdf()`
- Task 2.5: Fix `addPageNumbers()`
- Task 2.6: Fix `signPdf()` naming
- Task 3.5: Fix dark mode
- Task 3.6: Add memory management

### Wave 3 (Depends on Wave 2):
- Task 4.1: Integration test for `protectPdf()`
- Task 4.2: Integration test for `mergePdfs()`
- Task 4.3: Integration test for `compressPdf()`
- Task 4.4: Integration test for `pdf-to-pptx`
- Task 4.5: Feature registry validation script

### Wave 4 (Depends on Wave 3):
- Task 5.1: Update tool descriptions
- Task 5.2: Create limitations page

---

## Definition of Done

A task is complete when:
1. Code changes are made and follow project conventions
2. Tests are added/updated and pass (`npm test`)
3. Type checking passes (`npm run typecheck`)
4. Linting passes (`npm run lint`)
5. Build succeeds (`npm run build`)
6. Acceptance criteria are verified
7. No new warnings or errors introduced

---

## Risk Notes

- **Task 1.1 (protectPdf):** If pdf-lib's encryption is fundamentally broken, this may require a fallback approach or removing the tool. Budget extra time.
- **Task 2.1 (compressPdf):** Real PDF compression is a research problem. The minimum viable fix is to make levels actually change `useObjectStreams` and document limitations.
- **Task 2.2 (translatePdf):** CJK font embedding adds ~16MB to the bundle. Consider lazy-loading the font or using a canvas-based overlay approach.
- **Task 2.3 (convertWordToPdf):** html2canvas has known limitations with complex CSS. Test with real-world DOCX files.
