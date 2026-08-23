# Task 4.2 — 44px touch targets in Toolbar, ZoomControls, HistoryControls

## What

Added `min-w-[44px] min-h-[44px]` to icon-only buttons in:
- `src/components/editor/toolbar/ZoomControls.tsx` — 3 buttons (Zoom Out, Zoom In, Fit)
- `src/components/editor/toolbar/HistoryControls.tsx` — 2 buttons (Undo, Redo)
- `src/components/editor/toolbar/ExportButtons.tsx` — 2 buttons (Export Page, Export All) — added only `min-h-[44px]` (width already ≥44px from `px-4`)
- `src/components/editor/Toolbar.tsx` — 2 standalone buttons (dark mode toggle, close file)

ToolPicker.tsx already had `min-w-[44px] min-h-[44px]` from prior commit `de8a813 fix(a11y): increase toolbar touch targets to 44px`.

## Acceptance
- 14/14 Toolbar tests pass
- All targeted buttons meet WCAG 2.5.5 (44×44 px minimum)
- No layout regressions — `min-*` is inclusive of existing padding
