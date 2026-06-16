# LocalPDF Studio - Issue Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Fix all critical and medium severity issues across accessibility, code quality, UI/UX design, and test coverage.

**Tech Stack:** React 19, TypeScript, Vitest, Tailwind CSS v4, Zustand, pdf-lib, pdfjs-dist

---

## Phase 1: Quick Wins (4 tasks, ~5-15 min each)

### Task 1.1: Add :focus-visible CSS
- Modify: src/index.css
- Add: :focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
- Verify: npm run typecheck
- Commit: fix(a11y): add :focus-visible styles

### Task 1.2: Add aria-label to MergePdf drag handle
- Modify: src/pages/tools/MergePdf.tsx:158
- Add aria-label="Drag to reorder"
- Verify: npm run typecheck && npm run lint
- Commit: fix(a11y): add aria-label to drag handle

### Task 1.3: Fix process.env.NODE_ENV to import.meta.env.DEV
- Modify: src/components/editor/Toolbar.tsx:173, 217
- Replace with import.meta.env.DEV
- Verify: npm run typecheck
- Commit: fix: use import.meta.env.DEV

### Task 1.4: Fix AI Summarizer progress backwards
- Modify: src/pages/tools/AiSummarizer.tsx:42
- Separate extraction/summarization progress states
- Verify: npm run typecheck && npm run lint
- Commit: fix: separate progress states

---

## Phase 2: Memory Leaks & Type Safety (5 tasks)

### Task 2.1: ToastContext setTimeout cleanup
- Modify: src/contexts/ToastContext.tsx:36-40
- Track timeout IDs with useRef, cleanup on unmount
- Verify: npm run typecheck && npm test -- src/contexts/ToastContext.test.tsx
- Commit: fix: clear setTimeout on Toast unmount

### Task 2.2: AnnotationLayer event listener cleanup
- Modify: src/components/editor/AnnotationLayer.tsx:42-73
- Add useRef for cleanup, call on unmount
- Verify: npm run typecheck && npm test -- src/components/editor/
- Commit: fix: clean up event listeners on AnnotationLayer unmount

### Task 2.3: Annotation item event listeners
- Modify: src/components/editor/annotations/TextAnnotationItem.tsx, ImageAnnotationItem.tsx
- Apply same cleanup pattern
- Commit: fix: event listener cleanup in annotation items

### Task 2.4: SortableThumbnail wrong dependency
- Modify: src/components/editor/SortableThumbnail.tsx:88
- Remove thumbnailUrl from useEffect deps
- Verify: npm run typecheck
- Commit: fix: remove thumbnailUrl from deps

### Task 2.5: encryption.ts as any type casts
- Modify: src/lib/encryption.ts:12, 24
- Define proper TypeScript interfaces, remove as any
- Verify: npm run typecheck && npm test -- src/lib/encryption.test.ts
- Commit: fix: remove as any casts in encryption

---

## Phase 3: Accessibility (4 tasks)

### Task 3.1: Add skip link
- Modify: src/components/layout/Layout.tsx
- Add skip link with href=#main-content
- Verify: npm run typecheck && npm run lint
- Commit: feat(a11y): add skip link

### Task 3.2: Keyboard reordering in MergePdf
- Modify: src/pages/tools/MergePdf.tsx
- Add Move Up/Down buttons as keyboard alternative
- Verify: npm run typecheck && npm test -- src/pages/tools/MergePdf.test.tsx
- Commit: feat(a11y): add keyboard reordering

### Task 3.3: Increase toolbar touch targets
- Modify: src/components/editor/toolbar/ToolPicker.tsx:22-85
- Change from 32x32 to 44x44px minimum
- Verify: npm run typecheck && npm run dev (visual)
- Commit: fix(a11y): increase touch targets

### Task 3.4: Reduced motion for spinner
- Modify: src/pages/editor/EditorEmptyState.tsx:20
- Check prefersReducedMotion before animate-spin
- Verify: npm run typecheck
- Commit: fix(a11y): respect reduced motion

---

## Phase 4: Code Quality (5 tasks)

### Task 4.1: Memoize keyboard shortcuts
- Modify: src/pages/Editor.tsx:69-111
- Wrap shortcuts in useMemo
- Verify: npm run typecheck && npm test -- src/pages/Editor.test.tsx
- Commit: perf: memoize keyboard shortcuts

### Task 4.2: React.memo on annotation components
- Modify: 5 files in src/components/editor/annotations/
- Wrap exports with React.memo
- Verify: npm run typecheck && npm test -- src/components/editor/
- Commit: perf: memoize annotation items

### Task 4.3: Extract color parsing utility
- Create: src/lib/color.ts
- Modify: Toolbar.tsx, edit.ts to use shared utility
- Verify: npm run typecheck && npm test -- src/lib/edit.test.ts
- Commit: refactor: extract hex-to-RGB utility

### Task 4.4: Lazy load tool pages
- Modify: src/App.tsx:9-40
- Convert static imports to lazy() with Suspense
- Verify: npm run typecheck && npm run dev
- Commit: perf: lazy load tool pages

### Task 4.5: Migrate from deprecated useEditor()
- Modify: EditorContext.tsx + 5 components
- Migrate to granular store hooks
- Verify: npm run typecheck && npm test -- src/components/editor/
- Commit: refactor: migrate from useEditor

---

## Phase 5: UI/UX Polish (3 tasks)

### Task 5.1: Premium card architecture
- Modify: src/pages/Home.tsx
- Add double-bezel design with nested shells
- Add icon hover animations
- Verify: npm run dev (visual)
- Commit: design: premium card architecture

### Task 5.2: Floating glass header
- Modify: src/components/layout/Header.tsx
- Transform to floating glass pill with backdrop-blur
- Verify: npm run dev (visual)
- Commit: design: floating glass header

### Task 5.3: Staggered entrance animations
- Modify: src/pages/Home.tsx, src/index.css
- Add fade-up animation with staggered delays
- Verify: npm run dev (visual)
- Commit: design: staggered animations

---

## Phase 6: Test Coverage (6 tasks)

### Task 6.1: pdf.ts reorderPdfPages & addPageNumbers tests
- Modify: src/lib/pdf.test.ts
- Add tests for all positions and edge cases
- Verify: npm test -- src/lib/pdf.test.ts
- Commit: test: pdf reorder/page numbers

### Task 6.2: security.ts tests
- Create: src/lib/security.test.ts
- Test dataUrlToBytes, signPdf, redactPdf
- Verify: npm test -- src/lib/security.test.ts
- Commit: test: security functions

### Task 6.3: image.ts tests
- Create: src/lib/image.test.ts
- Test jpgsToPdf, pdfToJpgs
- Verify: npm test -- src/lib/image.test.ts
- Commit: test: image functions

### Task 6.4: pdfa.ts tests
- Create: src/lib/pdfa.test.ts
- Test all 3 levels (1b, 2b, 3b)
- Verify: npm test -- src/lib/pdfa.test.ts
- Commit: test: pdfa conversion

### Task 6.5: Fix withRetry import
- Modify: src/lib/ai.test.ts
- Import from actual module instead of re-implementing
- Verify: npm test -- src/lib/ai.test.ts
- Commit: test: use actual withRetry

### Task 6.6: Fix toast utilities
- Modify: src/tests/utils.tsx:120-126
- Implement actual toast assertions
- Verify: npm test
- Commit: test: toast utilities

---

## Summary: 26 Tasks Across 6 Phases

| Phase | Tasks | Est Time |
|-------|-------|----------|
| 1: Quick Wins | 4 | 20-60 min |
| 2: Memory & Types | 5 | 75-150 min |
| 3: Accessibility | 4 | 60-120 min |
| 4: Code Quality | 5 | 100-225 min |
| 5: UI/UX Polish | 3 | 90-180 min |
| 6: Test Coverage | 6 | 90-180 min |

**Total: ~8-12 hours**

---

## Execution Options

**1. Subagent-Driven (recommended)** - Fresh subagent per task, parallel work.

**2. Inline Execution** - Sequential with checkpoints.

Which approach?
