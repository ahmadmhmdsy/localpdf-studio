# LocalPDF Studio

A comprehensive, client-side PDF manipulation tool built with React. Merge, split, convert, annotate, and edit PDFs entirely in your browser — no data uploaded to servers.

![GitHub License](https://img.shields.io/badge/license-MIT-blue)

## Features

### 🗂️ Organize
Merge, split, rotate, reorder, remove, and extract pages from PDFs.

### 🎨 Edit & Annotate
Full editor with text, drawing, image, signature, and redaction tools. Keyboard shortcuts (press `?` to see all).

### 🔄 Convert
- PDF ↔ Word, Excel, PowerPoint, JPG, HTML
- Scan to PDF (camera capture), OCR PDFs

### 🔒 Security
Add/remove passwords, redact sensitive content, repair damaged PDFs.

### 🤖 AI-Powered
AI Summarizer and Translate PDF (requires Gemini API key).

### ⚡ Performance
- 100% client-side — files never leave your browser
- 100MB file size limit
- Dark mode support
- Bundle-split for fast loading (pdf-lib, tesseract, office parsers split into separate chunks)

## Prerequisites

- Node.js 18+
- npm

## Quick Start

```sh
# Install dependencies
npm install

# Set up your Gemini API key (for AI features)
# Edit .env and add:
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Start development server (port 3000)
npm run dev
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run all tests (Vitest) |
| `npx vitest run src/pages/tools/MergePdf.test.tsx` | Run a single test file |

## Tech Stack

- **Framework:** React 19, TypeScript
- **Build:** Vite 6
- **Styling:** Tailwind CSS v4
- **PDF:** pdf-lib, pdfjs-dist
- **State:** Zustand (3 stores)
- **AI:** @google/genai (Gemini API)
- **Office:** mammoth, docx, exceljs
- **OCR:** tesseract.js
- **Testing:** Vitest + React Testing Library

## Project Structure

```
src/
├── components/       # Reusable UI (editor, tools, layout)
│   ├── editor/       # Editor-specific (Canvas, Toolbar, Sidebar, etc.)
│   ├── tools/        # Shared tool UI (FileUploadZone, ProcessingState, etc.)
│   └── ui/           # Generic UI (ToastContainer, ConfirmModal, etc.)
├── pages/
│   └── tools/        # 29+ individual tool pages
├── lib/              # Utility functions (pdf, ai, compress, security, etc.)
├── store/            # Zustand stores (document, tools, annotations)
├── contexts/         # React contexts (EditorContext, ToastContext)
├── hooks/            # Custom hooks (useKeyboardShortcuts)
├── constants/        # Shared constants (tools list, colors)
└── tests/            # Test setup, fixtures, utilities
```

## Architecture

- **Routes:** All 29+ tools are hard-coded in `src/App.tsx` under `/tools/:tool-name`
- **Editor:** Route `/editor` with canvas, sidebar, and properties panel
- **Error Handling:** Per-tool `ToolErrorBoundary` + global `ErrorBoundary`
- **Notifications:** Toast system (`ToastContext` + `ToastContainer`) replaces all `alert()` calls
- **AI Retry:** `withRetry()` utility in `src/lib/ai.ts` with exponential backoff (3 attempts)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | For AI features | Google Gemini API key |

## License

MIT
