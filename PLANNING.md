(file content unchanged — appending TASK-27 after line 587)

---

## TASK-27: Comprehensive Audit Remediation
**Started**: 2026-07-19
**Status**: Planning complete, execution in progress
**Source**: 7-dimensional audit (features, testing, a11y, security, build, deps, CI/CD/DX)

### Overview
Remediate 67 issues from comprehensive codebase audit across 6 grouped PRs. Covers legal, infrastructure, dependency hygiene, security, accessibility, testing quality, and feature honesty.

### Issue Summary

#### Critical (7)
| # | Issue | Category |
|---|-------|----------|
| C1 | No `LICENSE` file | Legal |
| C2 | No CI pipeline (zero automated gates) | Infrastructure |
| C3 | `react-router-dom@7.13.1` — 8 high-severity CVEs | Deps |
| C4 | Single-char keyboard shortcuts block screen readers (SC 2.1.4) | A11y |
| C5 | Canvas PDF content has no accessible alternative (SC 1.1.1) | A11y |
| C6 | `pdf-lib` + `pdfjs-dist` always in initial bundle | Build |
| C7 | `"strict": true` not set in tsconfig | Build |

#### High (11)
| # | Issue | Category |
|---|-------|----------|
| H1 | `motion`, `html2canvas`, `dotenv`, `autoprefixer` are dead deps | Deps |
| H2 | 5 deps in wrong `dependencies` vs `devDependencies` section | Deps |
| H3 | `@typescript-eslint/no-explicit-any` is only `warn` | Build |
| H4 | `jspdf` (~600KB) statically imported in 2 files | Build |
| H5 | `jszip` statically imported in `image.ts` | Build |
| H6 | `TranslatePdf.tsx` bypasses `getGenAI()` singleton | Security |
| H7 | Toolbar missing `role="toolbar"` | A11y |
| H8 | Error boundaries lack `role="alert"` and focus management | A11y |
| H9 | Non-MVP tool links lack `aria-disabled="true"` | A11y |
| H10 | Dead test duplicate: `src/tests/unit/lib/pdf.test.ts` | Testing |
| H11 | `image.test.ts` mocks itself — real functions never tested | Testing |

#### Medium (29)
License, CSP `'unsafe-inline'`, pre-commit hooks, `CONTRIBUTING.md`, `.nvmrc`, PR templates, footer contrast, `--text-3` contrast, "Choose files" button, `aria-current`, OnboardingTour focus, canvas empty state, download UX inconsistency, StepTrack usage, tool description overstatements, lib test depth, integration/e2e gaps, mock style inconsistency, two DnD libs, office-parsers chunk, `exceljs` fstream chain, 6 outdated major deps, missing store/component tests, `AddWatermark` image claim.

#### Low (20)
All decorative `aria-hidden`, toast `role="alert"` vs `role="status"`, `CHANGELOG.md`, README polish, filename sanitization, AES-128 documentation, IndexedDB note, tsconfig missing flags, dead config flags, `color.ts`/`pdfjs.ts` untested, `WordToPdf.test.tsx` flake, empty `src/tests/e2e/` dir, download UX, raster conversion honesty, `PdfToExcel` table extraction.

### Resolution Strategy: 6 Grouped PRs

#### PR 1: Legal & Infrastructure (9 todos)
**Issues**: C1, C2, M2, M3, M4, M5, L4, L5, L6

| # | Change |
|---|--------|
| 1.1 | Create `LICENSE` (MIT) |
| 1.2 | Add `.github/workflows/ci.yml` — `typecheck && lint && test` on push/PR |
| 1.3 | Add `.github/ISSUE_TEMPLATE/bug_report.md` |
| 1.4 | Add `.github/ISSUE_TEMPLATE/feature_request.md` |
| 1.5 | Add `.github/PULL_REQUEST_TEMPLATE.md` |
| 1.6 | Create `CONTRIBUTING.md` |
| 1.7 | Create `.nvmrc` (`22`) |
| 1.8 | Add `"engines": { "node": ">=20.19.0" }` to `package.json` |
| 1.9 | Polish `README.md` — add missing commands, CI badge, API key warning |

**Files**: `LICENSE`, `.github/workflows/ci.yml`, `.github/ISSUE_TEMPLATE/*`, `.github/PULL_REQUEST_TEMPLATE.md`, `CONTRIBUTING.md`, `.nvmrc`, `package.json`, `README.md`

#### PR 2: Dependency & Build Hygiene (16 todos)
**Issues**: C3, C7, H1, H2, H3, H5, M19, M21-M27, L10-L14

| # | Change |
|---|--------|
| 2.1 | Remove `motion`, `html2canvas`, `dotenv`, `autoprefixer` from deps |
| 2.2 | Move `@types/dompurify`, `@vitejs/plugin-react`, `@vitest/coverage-v8` to devDeps |
| 2.3 | Upgrade `react-router-dom` to `^7.15.0` |
| 2.4 | Run `npm audit fix` |
| 2.5-2.9 | Evaluate upgrading `lucide-react`, `pdfjs-dist`, `@google/genai`, `react-dropzone`, `docx` |
| 2.10 | Replace `react-signature-canvas` alpha with `signature_pad` |
| 2.11-2.12 | Enable `strict: true` + strict flags in tsconfig; fix errors |
| 2.13-2.14 | Remove dead tsconfig flags; set `no-explicit-any` to `error` |
| 2.15 | Remove misleading `pdf-lib` manualChunk entry |
| 2.16 | Consolidate DnD libs (decision) |

**Files**: `package.json`, `tsconfig.json`, `eslint.config.js`, `vite.config.ts`, `src/`

#### PR 3: Security Fixes (6 todos)
**Issues**: H6, L7, L8, L9 + CSP documentation

| # | Change |
|---|--------|
| 3.1 | Fix `TranslatePdf.tsx` to reuse `getGenAI()` singleton |
| 3.2 | Add `sanitizeFilename()` to `FileUploadZone.tsx` |
| 3.3 | Document API key exposure in README |
| 3.4 | Update CSP comment |
| 3.5 | Add JSDoc to `encryption.ts` noting AES-128 |
| 3.6 | Add JSDoc to `EditorContext.tsx` noting IndexedDB |

**Files**: `src/lib/ai.ts`, `src/pages/tools/TranslatePdf.tsx`, `src/components/tools/FileUploadZone.tsx`, `README.md`, `index.html`, `src/lib/encryption.ts`, `src/contexts/EditorContext.tsx`

#### PR 4: Accessibility WCAG 2.1 AA (18 todos)
**Issues**: C4, C5, H7, H8, H9, M6-M11, L1-L3

| # | Change |
|---|--------|
| 4.1-4.3 | Fix keyboard shortcuts — add `Ctrl+` modifier, settings toggle, update help dialog |
| 4.4 | Add `role="img"` + `aria-label` to canvas |
| 4.5 | Add `role="toolbar"` to toolbar |
| 4.6-4.7 | Add `role="alert"` + focus to error boundaries |
| 4.8 | Add `aria-disabled="true"` to non-MVP links |
| 4.9 | Fix `--text-3` contrast in light theme |
| 4.10 | Fix "Choose files" `<span>` → `<button>` |
| 4.11 | Add `aria-current="page"` to nav |
| 4.12 | Fix OnboardingTour focus management |
| 4.13 | Add `role="status"` to canvas empty state |
| 4.14-4.17 | Add `aria-hidden` to separators, icons, toast role fix |

**Files**: `src/hooks/useKeyboardShortcuts.ts`, `src/pages/Editor.tsx`, `src/components/editor/KeyboardShortcutsHelp.tsx`, `src/components/editor/Canvas.tsx`, `src/components/editor/Toolbar.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/ToolErrorBoundary.tsx`, `src/pages/Home.tsx`, `src/index.css`, `src/components/tools/FileUploadZone.tsx`, `src/components/layout/Header.tsx`, `src/components/onboarding/OnboardingTour.tsx`, `src/components/ui/ToastContainer.tsx`, `src/components/layout/Footer.tsx`

#### PR 5: Testing Quality (12 todos)
**Issues**: H10, H11, M15-M18, L15-L17, M28

| # | Change |
|---|--------|
| 5.1 | Delete `src/tests/unit/lib/pdf.test.ts` |
| 5.2 | Fix `image.test.ts` self-mock pattern |
| 5.3-5.6 | Add meaningful assertions to encryption, compress, edit, security tests |
| 5.7-5.8 | Add tests for `toastStore.ts`, `StepTrack.tsx` |
| 5.9 | Fix mock style inconsistency (standardize on static import) |
| 5.10 | Clean empty `e2e/` directory |
| 5.11-5.12 | Add tests for `pdfjs.ts`, `color.ts` |

**Files**: `src/tests/unit/lib/pdf.test.ts` (delete), `src/lib/image.test.ts`, `src/lib/encryption.test.ts`, `src/lib/compress.test.ts`, `src/lib/edit.test.ts`, `src/lib/security.test.ts`, `src/store/toastStore.test.ts` (new), `src/components/tools/StepTrack.test.tsx` (new), `src/tests/e2e/tools/`

#### PR 6: Feature Polish & Honesty (10 todos)
**Issues**: M12-M14, M29, L18-L20

| # | Change |
|---|--------|
| 6.1-6.5 | Fix tool descriptions (AddWatermark, RotatePdf, SignPdf, AddPageNumbers, constants/tools.ts) |
| 6.6 | Standardize download UX on `DownloadState` (12 tools) |
| 6.7 | Wire `StepTrack` into multi-step tools (13 tools) |
| 6.8 | Fix CompressPdf option descriptions |
| 6.9 | Add honesty note to ComparePdf |
| 6.10 | Fix TranslatePdf overlap (replace vs append) |

**Files**: `src/constants/tools.ts`, 12 tool pages, `src/pages/tools/TranslatePdf.tsx`, `src/pages/tools/CompressPdf.tsx`, `src/pages/tools/ComparePdf.tsx`

### Quality Gates (all PRs)
```sh
npm run typecheck       # 0 errors
npm run lint            # 0 errors, 0 warnings
npm test                # all pass
npm run test:coverage   # src/lib/** ≥80/70/80/80
npm run build           # succeeds
npm audit               # 0 high, 0 critical
```

### PR Dependency Graph
```
PR 1 (Legal/Infra)     ← no deps
PR 2 (Deps/Build)      ← no deps
PR 3 (Security)        ← PR 2
PR 4 (A11y)            ← PR 2 (tsconfig may touch same files)
PR 5 (Testing)         ← no deps
PR 6 (Feature Polish)  ← no deps
```
PR 1-6 can execute sequentially or PR 4/5/6 can parallelize after PR 2.

---

## TASK-28: Finish What's NOT Done
**Started**: 2026-07-19
**Source spec**: `docs/superpowers/specs/2026-07-19-finish-remaining-work.md`
**Plan**: `docs/superpowers/plans/2026-07-19-finish-remaining-work.md`
**Status**: Plan written, awaiting approval before execution

### Overview
Close every gap captured in the 2026-07-19 inventory that did not ship in TASK-27 — primarily the `pdfjs-dist` CVE blocker, the remaining TASK-27 PR 2 / PR 5 tails, and the four TASK-26 priority buckets (P0 dark mode, P1 a11y, P2 responsive, P3 visual). Also tidy workspace hygiene (untracked reference docs, lint noise).

### Phases (8)
- **Phase 0** — `npm audit fix` for `pdfjs-dist >=6.2.108` (BLOCKER)
- **Phase 1** — TASK-27 PR 2 tail: enforce `no-explicit-any` + swap `react-signature-canvas` → `signature_pad`
- **Phase 2** — TASK-27 PR 5 tail: structural assertions + mock-style consistency
- **Phase 3** — TASK-26 P0: Editor dark-mode migration (211 hardcoded colors → CSS vars)
- **Phase 4** — TASK-26 P1: a11y finishing (focus trap, 44 px touch, focus-visible)
- **Phase 5** — TASK-26 P2: responsive (Header drawer, viewport safe-area)
- **Phase 6** — TASK-26 P3: visual polish across 15 tool pages
- **Phase 7** — PR 7 future: documented, NOT executed
- **Phase 8** — Workspace hygiene (untracked files, lint warnings)

### Parallelizable Execution
```
Phase 0 → Phase 1.1 || Phase 1.2 || Phase 3 → Phase 4 || Phase 5 → Phase 6 → Phase 2 → Phase 8
```

### Quality Gate (TASK-28 done means)
```sh
npm run typecheck       # 0 errors
npm run lint            # 0 errors, < 50 warnings
npm test                # 558+ tests pass
npm run test:coverage   # src/lib/** ≥80/70/80/80
npm run build           # succeeds
npm audit               # 0 high, 0 critical
grep -rE "bg-(white|gray-)|text-(gray-|pink-|teal-)|border-gray-" src/ | wc -l  # 0
```
