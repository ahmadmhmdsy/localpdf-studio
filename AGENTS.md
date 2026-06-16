# LocalPDF Studio — Agent Guide

## Quick start

```sh
npm install        # install deps
npm run dev        # dev server at port 3000
npm run build      # production build to dist/
npm run typecheck  # TypeScript check (tsc --noEmit)
npm run lint       # ESLint
npm test           # run all vitest tests
```

- `.env` needs `VITE_GEMINI_API_KEY` for AI features (summarize, translate). `.env*` is gitignored (except `.env.example`). `APP_URL` in `.env` is for self-referential links.
- Path alias `@/` → project root (`./`), NOT `src/`. Verified in `tsconfig.json` paths and `vite.config.ts` resolve.alias.
- Tailwind CSS v4 is configured via `@tailwindcss/vite` plugin — no `postcss.config` or `tailwind.config` file. Styles are in `src/index.css`.

## Architecture

- **Entry:** `src/main.tsx` → `src/App.tsx` — 31 tool routes hard-coded in App.tsx under `/tools/:tool-name`.
- **Editor page:** `src/pages/Editor.tsx` at route `/editor`. Press `?` for keyboard shortcuts.
- **Shared tool UI:** `src/components/tools/` (ToolLayout, FileUploadZone, ProcessingState, DownloadState). Every tool page uses these.
- **State:** 3 Zustand stores in `src/store/` — `documentStore`, `toolsStore`, `annotationsStore`. The `EditorContext` in `src/contexts/EditorContext.tsx` fires IndexedDB restore on mount and re-exports a combined `useEditor()` hook for backwards compatibility. Prefer granular store hooks for new code.
- **Toast system:** `ToastContext` + `ToastContainer` — use `showToast()` instead of `alert()` or console.
- **Error boundary:** `ErrorBoundary` wraps all routes; `ToolErrorBoundary` wraps each tool individually.
- **PDF lib wrappers:** `src/lib/pdf.ts` (merge, split, watermark, rotate, etc.), `src/lib/ai.ts` (Gemini, `withRetry()` with 3 attempts, exponential backoff), `src/lib/compress.ts`, `src/lib/edit.ts`, `src/lib/encryption.ts`, `src/lib/repair.ts`, etc.
- **pdfjs worker:** `src/lib/pdfjs.ts` uses `pdfjs-dist/build/pdf.worker.min.mjs?url` (Vite URL import) and sets `GlobalWorkerOptions.workerSrc`.
- **Constants:** `src/constants/tools.ts` enumerates all 31 categories/tools (used by Home page grid). `src/constants/colors.ts` has annotation color palettes.
- **Bundle splitting:** `vite.config.ts` defines manualChunks for core (react), pdf-lib, tesseract, office-parsers, ai. HMR can be disabled via `DISABLE_HMR=true` env var (for AI Studio compatibility).
- **CSP:** `index.html` has a Content-Security-Policy header — be aware when adding external resources.
- **Task tracking:** `TASK.md` tracks active/completed tasks. `PLANNING.md` has project vision and architecture rationale.

## Testing

- **Framework:** vitest + @testing-library/react + user-event + jsdom.
- **Setup file:** `src/tests/setup.ts` — mocks idb-keyval, DOMMatrix (class, not arrow — pdfjs-dist requires constructor), canvas, Blob, IntersectionObserver, ResizeObserver, pdfjs worker URL import.
- **Test wrapper:** `src/tests/utils.tsx` exports `renderWithProviders()` (wraps with ToastProvider + EditorProvider + BrowserRouter). Use this for all component tests.
- **Fixtures:** `src/tests/fixtures/` — `pdfGenerator.ts`, `imageGenerator.ts`, `officeGenerator.ts` create dummy files for tests.
- **Test files live alongside source:** `src/pages/tools/MergePdf.test.tsx` tests `MergePdf.tsx`. Also in `src/lib/pdf.test.ts`, `src/components/tools/*.test.tsx`, `src/components/editor/*.test.tsx`.
- **Unit tests for pure lib functions:** in `src/tests/unit/lib/` (e.g., `pdf.test.ts` for `parsePageRanges`).
- **Run a single test file:** `npx vitest run src/pages/tools/MergePdf.test.tsx`
- **Mock pattern:** Mock heavy libs (pdf-lib, pdfjs-dist, file-saver) at the top of each test file using `vi.mock()`. Suppress expected console errors — the setup file already filters common warning patterns.

## Conventions

- Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for conditional class names.
- Keep components under ~500 lines; extract sub-components to separate files.
- Use `aria-label` on all icon-only buttons (WCAG 2.1 AA).
- Heavy libraries (pdfjs-dist, tesseract.js, mammoth, docx, xlsx, jszip) should be dynamically imported to avoid bundle bloat.
- AI calls use `withRetry()` (exponential backoff, 3 attempts) from `src/lib/ai.ts`.
- Prefer granular Zustand stores (`useDocumentStore`, `useToolsStore`, `useAnnotationsStore`) over the combined `useEditor()` hook for new code.

## `.windsurf/` directory

Contains Windsurf-specific agent configuration and system prompts. Not relevant for OpenCode — do not edit or depend on these files.

**Trap:** `.windsurf/.agentrc` and `HYBRID_AGENT_SYSTEM.md` reference Python tools (`ruff`, `bandit`, `mypy`, `uv`) from a different project — these do not apply to this TypeScript/React codebase.
