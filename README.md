# LocalPDF Studio

A PDF manipulation tool built with React that runs in your browser. Merge, split, convert, annotate, and edit PDFs locally; every tool shows its data boundary, and tools that would require a network or camera service are unavailable in the public beta.

![CI](https://github.com/anomalyco/localpdf-studio/actions/workflows/ci.yml/badge.svg)
![GitHub License](https://img.shields.io/badge/license-MIT-blue)

## Features

### 🗂️ Organize
Merge, split, rotate, reorder, remove, and extract pages from PDFs.

### 🎨 Edit & Annotate
Full editor with text, drawing, image, and signature tools. Keyboard shortcuts (press `?` to see all).

### 🔄 Convert
- PDF ↔ Word, Excel, PowerPoint, JPG, HTML
- Scan to PDF (camera capture) and OCR PDFs — unavailable in the public beta

### 🔒 Security
Repair damaged PDFs (parse/resave only). Add/remove passwords and the dedicated blackout/redaction workflow are disabled in the public beta and are not a confidentiality boundary.

### 🤖 AI-Powered
AI Summarizer and Translate PDF — unavailable in the public web beta. No file, prompt, or filename is sent to Google Gemini from the browser.

### ⚡ Performance
- Enabled tools process the selected file in the browser; each tool's data handling is disclosed in the UI
- 100MB file size limit
- Dark mode support
- Bundle-split for fast loading (pdf-lib, tesseract, office parsers split into separate chunks)

## Prerequisites

- [fnm](https://github.com/Schniz/fnm)
- Node.js `22.14.0` (exact supported runtime)
- npm `11.16.0` (exact supported runtime, activated with Corepack)

## Quick Start

```sh
# Activate the exact supported runtime
fnm install 22.14.0
fnm use 22.14.0
corepack enable npm
corepack prepare npm@11.16.0 --activate
node --version        # must print v22.14.0
npm --version         # must print 11.16.0

# Install the exact locked dependency graph
npm ci

# No API key setup is required for the web build.
# AI Summarizer and Translate PDF are unavailable in the public beta, and the
# browser build neither reads nor accepts an API key.

# Start development server (port 3000)
npm run dev
```

> **⚠️ API keys:** the public web build contains no API key and accepts none. `VITE_GEMINI_API_KEY` is no longer read by the application, because any `VITE_*` value is inlined into public client JavaScript and readable by anyone who loads the page. The desktop build stores a user-owned key in the on-disk app store (`settings.json`, key `geminiApiKey`) and is configured from the Settings UI. AI tools are unavailable in the public web beta.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm test` | Run all tests (Vitest) |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run production-browser smoke and accessibility gates (Playwright) |
| `npm run clean` | Remove `dist/` |
| `npx vitest run src/pages/tools/MergePdf.test.tsx` | Run a single test file |

### Browser tests (Playwright)

The browser gate runs against the **production build**, not the dev server. Install the Chromium browser once, then build and run the suite:

```sh
npx playwright install chromium   # one-time browser download
npm run build                     # the preview server serves dist/
npm run test:e2e                  # smoke + accessibility gates
```

`npm run test:e2e` starts its own `vite preview` server on `127.0.0.1:4173` via the Playwright `webServer` config, so no server needs to be running first. On CI, Chromium is installed with `npx playwright install --with-deps chromium` before the suite runs. See `e2e/` for the smoke and axe specs.

## Tech Stack

- **Framework:** React 19, TypeScript
- **Build:** Vite 6
- **Styling:** Tailwind CSS v4
- **PDF:** pdf-lib, pdfjs-dist
- **State:** Zustand (4 stores)
- **AI:** @google/genai (Gemini API; desktop store only — web routes disabled)
- **Office:** mammoth, docx, exceljs
- **OCR:** tesseract.js
- **Testing:** Vitest + React Testing Library (514+ tests)

## Project Structure

```
src/
├── components/       # Reusable UI (editor, tools, layout)
│   ├── editor/       # Editor-specific (Canvas, Toolbar, Sidebar, etc.)
│   ├── tools/        # Shared tool UI (FileUploadZone, ProcessingState, etc.)
│   └── ui/           # Generic UI (ToastContainer, ConfirmModal, etc.)
├── pages/
│   └── tools/        # 31 individual tool pages
├── lib/              # Utility functions (pdf, ai, compress, security, etc.)
├── store/            # Zustand stores (document, tools, annotations, toast)
├── contexts/         # React contexts (EditorContext, ToastContext)
├── hooks/            # Custom hooks (useKeyboardShortcuts)
├── constants/        # Shared constants (tools list, colors, limits)
└── tests/            # Test setup, fixtures, utilities
```

## Architecture

- **Routes:** All 31 tools are hard-coded in `src/App.tsx` under `/tools/:tool-name`
- **Editor:** Route `/editor` with canvas, sidebar, and properties panel
- **Error Handling:** Per-tool `ToolErrorBoundary` + global `ErrorBoundary`
- **Notifications:** Toast system (`ToastContext` + `ToastContainer`) replaces all `alert()` calls
- **AI Retry:** `withRetry()` utility in `src/lib/ai.ts` with exponential backoff (3 attempts)
- **State:** 4 granular Zustand stores; legacy `useEditor()` marked deprecated

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_URL` | No | Base URL for self-referential links and callbacks. |

The browser build accepts no API key. `VITE_GEMINI_API_KEY` is intentionally not read; the desktop build uses the on-disk app store instead (see warning above).

## License

MIT
