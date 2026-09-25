# LocalPDF Studio

A comprehensive, client-side PDF manipulation tool built with React. Merge, split, convert, annotate, and edit PDFs entirely in your browser — no data uploaded to servers.

![CI](https://github.com/anomalyco/localpdf-studio/actions/workflows/ci.yml/badge.svg)
![GitHub License](https://img.shields.io/badge/license-MIT-blue)

## Features

### 🗂️ Organize
Merge, split, rotate, reorder, remove, and extract pages from PDFs.

### 🎨 Edit & Annotate
Full editor with text, drawing, image, and signature tools. Keyboard shortcuts (press `?` to see all).

### 🔄 Convert
- PDF ↔ Word, Excel, PowerPoint, JPG, HTML
- Scan to PDF (camera capture), OCR PDFs

### 🔒 Security
Add/remove passwords and repair damaged PDFs. The dedicated blackout/redaction workflow is currently disabled and is not a confidentiality boundary.

### 🤖 AI-Powered
AI Summarizer and Translate PDF.

### ⚡ Performance
- 100% client-side — files never leave your browser
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

# Set up your Gemini API key (for AI features)
# Edit .env and add:
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Start development server (port 3000)
npm run dev
```

> **⚠️ API Key Warning:** `VITE_GEMINI_API_KEY` is embedded in the client-side JS bundle at build time. Never use a shared, org-level, or quota-sensitive key. Always use a personal Gemini API key scoped to your own account. This is inherent to browser-only apps — a backend proxy would be needed to fully hide the key.

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
| `npm run clean` | Remove `dist/` |
| `npx vitest run src/pages/tools/MergePdf.test.tsx` | Run a single test file |

## Tech Stack

- **Framework:** React 19, TypeScript
- **Build:** Vite 6
- **Styling:** Tailwind CSS v4
- **PDF:** pdf-lib, pdfjs-dist
- **State:** Zustand (4 stores)
- **AI:** @google/genai (Gemini API)
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
| `VITE_GEMINI_API_KEY` | For AI features | Google Gemini API key (user-owned, see warning above) |

## License

MIT
