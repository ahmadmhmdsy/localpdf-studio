# LocalPDF Studio — Agent Guide

## Quick start

Use the exact supported runtime before installing or validating the project:

```sh
fnm install 22.14.0
fnm use 22.14.0
corepack enable npm
corepack prepare npm@11.16.0 --activate
node --version        # must print v22.14.0
npm --version         # must print 11.16.0
npm ci                # reproducible install from package-lock.json
```

Then use the normal project scripts:

```sh
npm run dev          # dev server at port 3000 (set DISABLE_HMR=true for AI Studio)
npm run build        # production build to dist/
npm run preview      # preview production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm test             # all vitest tests (use -- --run for single run)
npm run test:coverage  # vitest with coverage
npm run clean        # rimraf dist/
```

- `.env*` is gitignored (except `.env.example`). The web build accepts no API key: AI tools (summarize, translate) are unavailable in the public web beta, and a `VITE_*` variable would be inlined into the public browser bundle. The desktop build stores a user-owned key via `tauri-plugin-store` instead. `APP_URL` in `.env` is for self-referential links.
- Path alias `@/` → project root (`./`), NOT `src/`. Verified in `tsconfig.json` paths and `vite.config.ts` resolve.alias.
- Tailwind CSS v4 is configured via `@tailwindcss/vite` plugin — no `postcss.config` or `tailwind.config` file. Styles are in `src/index.css`.

## Architecture

- **Entry:** `src/main.tsx` → `src/App.tsx` — 31 tool routes hard-coded under `/tools/:tool-name` via `lazy()` imports (code-split).
- **Backward-compat aliases:** `/tools/redact-pdf` → `/tools/blackout-pdf`, `/tools/unlock-pdf` → `/tools/decrypt-pdf` (both use `<Navigate>` redirect).
- **Editor page:** `src/pages/Editor.tsx` at route `/editor`. Press `?` for keyboard shortcuts.
- **Shared tool UI:** `src/components/tools/` (ToolLayout, FileUploadZone, ProcessingState, DownloadState, StepTrack). Every tool page uses these.
- **State:** 3 Zustand stores in `src/store/` — `documentStore`, `toolsStore`, `annotationsStore`. The `EditorContext` in `src/contexts/EditorContext.tsx` fires IndexedDB restore on mount and re-exports a combined `useEditor()` hook for backwards compatibility. Prefer granular store hooks for new code. Note: `toastStore.ts` is NOT re-exported from `src/store/index.ts` — always import directly from `src/store/toastStore.ts`.
- **Toast:** `useToastStore` (zustand) used directly, or `useToast()` from `ToastContext` for backwards compat. Never use `alert()`.
- **Error boundary:** `ErrorBoundary` wraps all routes; `ToolErrorBoundary` wraps each tool individually via `ToolRoute` wrapper in `App.tsx`.
- **PDF wrappers:** `src/lib/pdf.ts` (merge, split, watermark, rotate), `src/lib/ai.ts` (Gemini, `withRetry()` with 3 attempts, exponential backoff), `src/lib/compress.ts`, `src/lib/edit.ts`, `src/lib/encryption.ts`, `src/lib/repair.ts`, etc.
- **pdfjs worker:** `src/lib/pdfjs.ts` uses `pdfjs-dist/build/pdf.worker.min.mjs?url` (Vite URL import) and sets `GlobalWorkerOptions.workerSrc`.
- **Bundle splitting:** `vite.config.ts` defines manualChunks for core (react), pdf-lib, tesseract, office-parsers, ai. HMR can be disabled via `DISABLE_HMR=true` env var.
- **CSP:** `index.html` has a strict CSP — `connect-src` allows `https://generativelanguage.googleapis.com` (Gemini) and `ws://localhost:*` (HMR).
- **Task tracking:** `TASK.md` tracks active/completed tasks. `PLANNING.md` has project vision and architecture rationale.

## Testing

- **Framework:** vitest + @testing-library/react + user-event + jsdom.
- **Setup file:** `src/tests/setup.ts` — mocks idb-keyval, DOMMatrix (class, not arrow — pdfjs-dist requires constructor), canvas, Blob, IntersectionObserver, ResizeObserver, pdfjs worker URL import, tesseract.js.
- **Test wrapper:** `src/tests/utils.tsx` exports `renderWithProviders()` (wraps with ToastProvider + EditorProvider + BrowserRouter). Use this for all component tests.
- **Fixtures:** `src/tests/fixtures/` — `pdfGenerator.ts`, `imageGenerator.ts`, `officeGenerator.ts` create dummy files for tests.
- **Test files live alongside source:** `src/pages/tools/MergePdf.test.tsx` tests `MergePdf.tsx`. Also in `src/lib/` (unit tests), `src/components/tools/`, `src/components/editor/`, `src/store/`.
- **Run a single test file:** `npx vitest run src/pages/tools/MergePdf.test.tsx`
- **Coverage thresholds:** `src/lib/**` requires 80% lines/functions/statements, 70% branches (set in `vitest.config.ts`).
- **Mock pattern:** Mock heavy libs (pdf-lib, pdfjs-dist, file-saver) at the top of each test file using `vi.mock()`. The setup file already filters common warning patterns.

## Conventions

- Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for conditional class names.
- Keep components under ~500 lines; extract sub-components to separate files.
- Use `aria-label` on all icon-only buttons (WCAG 2.1 AA).
- Heavy libraries (pdfjs-dist, tesseract.js, mammoth, docx, xlsx, jszip) should be dynamically imported to avoid bundle bloat.
- AI calls use `withRetry()` (exponential backoff, 3 attempts) from `src/lib/ai.ts`.
- Prefer granular Zustand stores over the combined `useEditor()` hook for new code.
- Use `logError()` from `src/lib/logger.ts` (dev-only console output) for error tracking.
