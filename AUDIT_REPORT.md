# LocalPDF Studio — Full Audit Report

Generated: 2026-07-19
Scope: Feature coverage, architecture, testing, accessibility, security, build/performance, dependencies, CI/CD/DX

---

## 1. FEATURE COVERAGE & TOOL ANALYSIS

### 1.1 Routes vs Constants — 100% Aligned
All 31 tools in `src/constants/tools.ts` have corresponding routes in `src/App.tsx`. 2 backward-compat aliases (`redact-pdf → blackout-pdf`, `unlock-pdf → decrypt-pdf`) use `<Navigate>` redirect.

### 1.2 Tool-by-Tool Issues

| Tool | Issue |
|------|-------|
| **HtmlToPdf** | Renders HTML → JPEG then embeds in PDF. **Text not selectable**. No URL input mode. |
| **CompressPdf** | "Cannot re-compress JPEG or PNG images" — low/medium/high options are semantically same (object-stream packing). |
| **PdfToPdfA** | Explicitly "best-effort" metadata only. No real PDF/A compliance check. |
| **TranslatePdf** | Translated text added **below** original text — final doc shows both languages overlapping. Uses per-paragraph Gemini calls (expensive + slow). |
| **SignPdf** | Description says "request electronic signatures from others" — **not implemented**. Only local drawn signature. No PKI/crypto. |
| **AddWatermark** | Description says "Stamp an image or text" — **text only implemented**, no image watermark. |
| **AddPageNumbers** | Description says "Choose typography, position and dimensions" — **only position configurable**. |
| **RotatePdf** | Description says "Rotate multiple PDFs at once" — **single file only**. |
| **ComparePdf** | Side-by-side visual only. **No diff detection** — no change highlighting or text comparison. |
| **PdfToExcel** | "Table detection is heuristic — may require manual adjustment." No AI-powered extraction. |
| **PdfToWord** | Text only — loses formatting, layout, images. |
| **PdfToPowerpoint** | Each page becomes PPTX slide **as raster image** — not editable. |

### 1.3 Download UX Inconsistency
- 17 tools use `DownloadState` (inline link + file size)
- 12 tools use `file-saver`'s `saveAs` (auto-download)
- No rationale for the split. Inconsistent user experience.

### 1.4 StepTrack Usage
Only `MergePdf` uses `StepTrack`. All other multi-step tools lack step progress indicators.

### 1.5 Missing Features for a PDF Tool Suite

| Feature | Priority | Notes |
|---------|----------|-------|
| PDF Form Filler | High | AcroForm fill & submit |
| Batch Processing | High | Same operation on multiple files |
| PDF to Text / CSV export | Medium | Expose extracted text as standalone output |
| Flatten PDF | Medium | Flatten annotations, form fields, layers |
| Header & Footer (custom) | Medium | Beyond just page numbers |
| PDF Metadata Editor | Medium | Edit/clear author, title, subject, keywords |
| Image Watermark | Medium | AddWatermark claims it but doesn't do it |
| Digital Signature (PKI) | Medium | Real crypto signatures vs drawn images |
| PDF Diff Comparison | Medium | Current ComparePdf has no change highlighting |
| Text search in Editor | Medium | Find within visual editor |
| Text selection/copy | Medium | Canvas lacks hidden text layer |
| Bates Numbering | Medium | Sequential stamping for legal |
| Page Labels | Low | Custom numbering schemes |
| PDF/A Validation | Low | Current explicitly says not validated |
| PDF Portfolio | Low | Combined PDF with cover sheet |

---

## 2. TESTING AUDIT

### 2.1 Coverage by Area

| Directory | Source | Test Files | Coverage | Missing |
|-----------|--------|------------|----------|---------|
| `src/lib/` | 20 | 19 | 95% | `color.ts`, `pdfjs.ts` |
| `src/pages/tools/` | 31 | 31 | **100%** | — |
| `src/store/` | 5 | 3 | 60% | `toastStore.ts`, `index.ts` |
| `src/components/tools/` | 5 | 4 | 80% | `StepTrack.tsx` |
| `src/components/editor/` | 8 | 4 | 50% | `Canvas.tsx`, `Sidebar.tsx`, `AnnotationLayer.tsx`, `SortableThumbnail.tsx` |
| Other components | 5 | 5 | 100% | — |

**Total: 72 test files.**

### 2.2 Quality Issues
- **Surface-level assertions**: ~75% of lib tests verify "doesn't throw" (`result instanceof Uint8Array`) but don't check actual output correctness (encryption tests never verify output is decryptable, compress tests never verify output is smaller).
- **Self-mocking tests**: `image.test.ts` mocks itself — the real `jpgsToPdf`/`pdfToJpgs` is never actually tested.
- **Dead duplicate**: `src/tests/unit/lib/pdf.test.ts` is a stale copy of `src/lib/pdf.test.ts` — should be deleted.
- **No integration tests**: Zero tests wire multiple modules together end-to-end.
- **No e2e tests**: `src/tests/e2e/tools/` is an empty directory.
- **Mock style inconsistency**: Half the lib tests use static imports, half use dynamic `await import()` — fragile pattern.

### 2.3 Priority Fixes
1. Delete `src/tests/unit/lib/pdf.test.ts` (dead duplicate)
2. Write meaningful assertions in lib tests (verify output correctness, not just type)
3. Fix `image.test.ts` to not mock itself
4. Add tests for `toastStore.ts`, `StepTrack.tsx`, `Canvas.tsx`, `Sidebar.tsx`
5. Add at least one integration test for a full tool flow

---

## 3. ACCESSIBILITY (WCAG 2.1 AA)

### 3.1 Strengths (Already Good)
- Skip-to-content link in `Layout.tsx`
- Semantic landmarks (`<main>`, `<header>`, `<nav>`, `<footer>`)
- Modal focus traps (`ConfirmModal`, `OnboardingTour`)
- Toast live region (`aria-live="polite"` + `role="alert"`)
- All icon-only buttons have `aria-label` and 44px touch targets
- `prefers-reduced-motion` respected
- `:focus-visible` global styles
- Decorative elements hidden with `aria-hidden`

### 3.2 Issues Found

#### CRITICAL
| # | Issue | File | SC | Recommendation |
|---|-------|------|----|----------------|
| 1 | Single-char keyboard shortcuts can't be remapped/disabled (`v`, `h`, `t`, `d`, etc.) | `useKeyboardShortcuts.ts` | 2.1.4 | Add modifier keys (Ctrl+) or settings toggle |
| 2 | Canvas PDF content has no accessible alternative | `Canvas.tsx:247` | 1.1.1 | Add `role="img"` + `aria-label`, consider hidden text layer |

#### HIGH
| # | Issue | File | SC | Recommendation |
|---|-------|------|----|----------------|
| 3 | Toolbar missing `role="toolbar"` | `Toolbar.tsx:219` | 4.1.2 | Add `role="toolbar"` + `aria-label` |
| 4 | Error boundaries lack `role="alert"` and focus management | `ErrorBoundary.tsx`, `ToolErrorBoundary.tsx` | 4.1.3, 2.4.3 | Add `role="alert"`, programmatic focus |
| 5 | Non-MVP tool links lack `aria-disabled` | `Home.tsx:51-82` | 4.1.2 | Add `aria-disabled="true"` to placeholder links |

#### MEDIUM
| # | Issue | File | SC |
|---|-------|------|----|
| 6 | Footer text fails AA contrast in light theme (`--text-3` on `--bg`) | `Footer.tsx`, `index.css` | 1.4.3 |
| 7 | Light theme `--text-3` contrast ratio is 3.86:1 (needs 4.5:1) | `index.css:26` | 1.4.3 |
| 8 | "Choose files" is a `<span>` styled as button, no keyboard access | `FileUploadZone.tsx:194` | 4.1.2 |
| 9 | No `aria-current="page"` on active nav links | `Header.tsx:20-41` | 4.1.2 |
| 10 | OnboardingTour step change loses focus | `OnboardingTour.tsx` | 2.4.3 |
| 11 | Canvas empty state not announced | `Canvas.tsx:217` | 4.1.3 |

#### LOW
| # | Issue | File |
|---|-------|------|
| 12 | Visual separator divs missing `aria-hidden` | `Toolbar.tsx:255,267` |
| 13 | All toasts use `role="alert"` (assertive) — should use `role="status"` for info/success | `ToastContainer.tsx:39` |
| 14 | Decorative icons missing `aria-hidden` in header, home | `Header.tsx:14`, `Home.tsx:70` |

---

## 4. SECURITY

### 4.1 CSP Analysis
- `style-src 'unsafe-inline'` — **MEDIUM**, required for React `style={{}}`, documented and tracked for migration
- `script-src 'wasm-unsafe-eval'` — restricted to WebAssembly, not JS eval
- `img-src 'self' data: blob:` — correct for PDF canvas rendering
- `connect-src` includes `https://generativelanguage.googleapis.com` + `ws://localhost:*` — correct for Gemini API + HMR
- `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` — strong anti-clickjacking

### 4.2 API Key Exposure
**CRITICAL**: `VITE_GEMINI_API_KEY` is embedded in plaintext in the production client bundle (`dist/assets/ai-*.js`). Mitigation: the app uses a BYOK (bring-your-own-key) model. Users configure their own key in `.env`. No shared/org key is at risk — but this must be clearly documented.

**Code quality issue**: `TranslatePdf.tsx:38` creates a separate `GoogleGenAI` instance, bypassing the singleton in `ai.ts`. Key is inlined twice in the bundle.

### 4.3 Other Findings
- DOM XSS: Only 1 `dangerouslySetInnerHTML` usage, protected by DOMPurify (`HtmlToPdf.tsx:109`)
- File upload: Magic byte validation for PDFs, 100MB size limit. Filename not sanitized (low risk, client-side only)
- Encryption: pdf-lib AES-128 default — acceptable for client-side
- IndexedDB: Stores full PDF binary (`editor-file-buffer`) and annotation history — medium risk if XSS occurs
- No `eval()`, `new Function()`, or dynamic code execution found

### 4.4 Priority Fixes
1. Document VITE_GEMINI_API_KEY exposure clearly in README (BYOK model)
2. Fix TranslatePdf.tsx to reuse `getGenAI()` singleton from `ai.ts`
3. Add filename sanitization to `FileUploadZone.tsx`

---

## 5. BUILD & PERFORMANCE

### 5.1 Bundle Splitting Issues

| Finding | Severity | Detail |
|---------|----------|--------|
| `pdf-lib` + `pdfjs-dist` always in initial bundle | **HIGH** | Statically imported by 16+ files (store, context, 4 libs). The `manualChunks` entry is cosmetic — they're always loaded eagerly. |
| `jspdf` (~600KB) statically imported | **MEDIUM** | In `office-word.ts` and `HtmlToPdf.tsx` — not in any lazy chunk |
| `jszip` statically imported in `image.ts` | **LOW-MEDIUM** | Used by Editor thumbnails — should be dynamic |
| `office-parsers` chunk groups 3 libs together | **LOW** | User pays for mammoth+docx+exceljs even if they use one |

### 5.2 TypeScript Strict Mode Gaps
- `"strict": true` is NOT set — no `strictNullChecks`, implicit `any` allowed
- Missing: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`
- `no-explicit-any` is only `warn` in ESLint (codebase uses `any` extensively)
- Dead config flags: `experimentalDecorators: true`, `useDefineForClassFields: false` (no decorators in project)

### 5.3 Unused Dependencies

| Package | Issue |
|---------|-------|
| `motion` | Completely unused — zero imports. ~75KB dead dep. |
| `html2canvas` | Unused — `html-to-image` is used instead |
| `dotenv` | Unnecessary — Vite loads `.env` natively |
| `autoprefixer` | Unused — no PostCSS config exists |

### 5.4 Wrong Dependency Section
- `@types/dompurify`, `@vitejs/plugin-react`, `@vitest/coverage-v8` are in `dependencies` instead of `devDependencies`

### 5.5 Two Drag-and-Drop Libraries
- `@dnd-kit/*` (Editor sidebar) AND `@hello-pangea/dnd` (MergePdf, JpgToPdf, OrganizePdf)
- Different APIs, different bundle cost. Worth consolidating.

### 5.6 Priority Fixes
1. Delete `motion`, `html2canvas`, `dotenv`, `autoprefixer` from package.json
2. Add `"strict": true` to tsconfig.json and fix resulting errors
3. Set `@typescript-eslint/no-explicit-any` to `error`
4. Move build-only deps to devDependencies
5. Consolidate to one DnD library
6. Either make pdf-lib truly lazy or remove the misleading `pdf-lib` manualChunk entry

---

## 6. DEPENDENCY HEALTH

### 6.1 Known Vulnerabilities (npm audit)
| Package | Advisory Count | Severity | Action |
|---------|---------------|----------|--------|
| `react-router-dom@7.13.1` | 8 advisories | **High** (incl. RCE) | Upgrade to `>=7.15.0` |
| `dompurify@3.3.3` | 8 advisories | Moderate | `npm audit fix` |
| `vite@6.2.x` | 2 advisories | High | Upgrade to `>=6.3.0` |
| `esbuild` | 1 advisory | High | Upgrade |
| `ws` | 2 advisories | High | Transitive, check impact |
| `undici` | 8 advisories | High | Transitive |
| `protobufjs` | 3 advisories | High | Transitive (Gemini SDK) |
| Total | 12 advisories (7 high, 3 moderate, 2 low) | | `npm audit fix` for fixable subset |

### 6.2 Deprecated Transitive Packages
All from `exceljs` → `unzipper` → `fstream` chain:
- `glob@7.2.3` (×4 instances), `fstream@1.0.12` (unmaintained), `rimraf@2.7.1`, `inflight@1.0.6`

### 6.3 Outdated Direct Dependencies (Major Versions Behind)
| Package | Current | Latest | Delta |
|---------|---------|--------|-------|
| `react-router-dom` | 7.13.1 | 7.15+ | Minor (security critical) |
| `@google/genai` | 1.29.0 | 2.12.0 | Major |
| `lucide-react` | 0.546.0 | 1.25.0 | Major |
| `pdfjs-dist` | 5.5.207 | 6.1.200 | Major |
| `docx` | 8.5.0 | 9.7.1 | Major |
| `react-dropzone` | 15.0.0 | 19.1.1 | Major |
| `react-signature-canvas` | 1.1.0-alpha.2 | — | Alpha, unmaintained |

### 6.4 Priority Fixes
1. **Upgrade `react-router-dom`** to `>=7.15.0` — 8 high-severity CVEs
2. Run `npm audit fix` for auto-fixable advisories
3. Upgrade major deps where feasible (pdfjs-dist 6.x, lucide-react 1.x)
4. Replace `react-signature-canvas` alpha with a stable alternative
5. Evaluate replacing `exceljs` (deprecated transitive chain) or accept risk

---

## 7. CI/CD & DEVELOPER EXPERIENCE

### 7.1 Critical Gaps
| Gap | Severity | Detail |
|-----|----------|--------|
| **No CI pipeline** | **CRITICAL** | No `.github/`, no automated lint/typecheck/test gate |
| **No LICENSE file** | **CRITICAL** | MIT badge in README is not legally binding without the actual license text |
| **No pre-commit hooks** | **HIGH** | Code can be committed with failing lint, type errors, or formatting issues |

### 7.2 Medium Gaps
| Gap | Detail |
|-----|--------|
| No `CONTRIBUTING.md` | External contributors have no guidance |
| No PR/issue templates | `PULL_REQUEST_TEMPLATE.md`, `ISSUE_TEMPLATE/` |
| No `.nvmrc` or `engines` field | Minimum Node version not documented |
| No commit conventions | No Conventional Commits or similar |

### 7.3 What's Already Good
- `AGENTS.md`: Excellent — covers commands, architecture, testing, conventions
- `TASK.md` / `PLANNING.md`: Unusually thorough — tracks 26 tasks with scope and phases
- `README.md`: Good — feature list, commands, tech stack, project structure
- `.gitignore`: Comprehensive
- HMR toggle (`DISABLE_HMR=true`) well-documented
- `logError()`/`logWarn()` gated behind `import.meta.env.DEV`

### 7.4 Priority Fixes
1. Create `LICENSE` file (MIT)
2. Add GitHub Actions CI workflow (`.github/workflows/ci.yml` — `typecheck && lint && test`)
3. Add `CONTRIBUTING.md`
4. Add pre-commit hooks (Husky + lint-staged)
5. Add `.nvmrc` + `engines` field to package.json
6. Add issue/PR templates

---

## 8. OVERALL SCORECARD

| Category | Score | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Feature Coverage | 7/10 | 0 | 2 | 8 | 4 |
| Testing | 7/10 | 0 | 2 | 4 | 2 |
| Accessibility | 7/10 | 2 | 3 | 5 | 3 |
| Security | 7/10 | 1 | 0 | 4 | 4 |
| Build/Performance | 6/10 | 1 | 2 | 3 | 3 |
| Dependency Health | 5/10 | 1 | 1 | 2 | 3 |
| CI/CD & DX | 4/10 | 2 | 1 | 2 | 2 |
| **Overall** | **6/10** | **7** | **11** | **28** | **21** |

### Top 10 Actions by Impact

1. **Add `LICENSE` file** — legal blocker, 2 minutes
2. **Set up GitHub Actions CI** — `typecheck && lint && test` on push/PR
3. **Upgrade `react-router-dom` to `>=7.15.0`** — 8 high-severity CVEs
4. **Add `"strict": true` to tsconfig** — catch real bugs
5. **Delete `motion`, `html2canvas`, `dotenv`, `autoprefixer`** — remove dead weight
6. **Delete `src/tests/unit/lib/pdf.test.ts`** — dead duplicate
7. **Fix keyboard shortcuts** (SC 2.1.4) — blocks screen reader users
8. **Add canvas accessible alternative** (SC 1.1.1)
9. **Add `aria-current="page"` to nav, `role="toolbar"` to toolbar, `role="alert"` to error boundaries**
10. **Fix TranslatePdf.tsx to reuse `getGenAI()` singleton**
