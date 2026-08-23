# Task 6.1 — Tool page visual polish (Phase 6 P3)

## What
Added a subtle `shadow-inner shadow-[var(--border)]/40` (combined with existing `shadow-sm` where present) to the primary content card in 11 of the 15 plan-listed tool pages:

Cards updated (added inner shadow for premium feel):
- MergePdf.tsx
- SplitPdf.tsx
- AddWatermark.tsx
- RotatePdf.tsx
- RemovePages.tsx
- ExtractPages.tsx
- AddPageNumbers.tsx
- OrganizePdf.tsx
- CompressPdf.tsx
- CropPdf.tsx
- RepairPdf.tsx (added to existing issues-fixed card)
- AiSummarizer.tsx (added to summary card)

## Files NOT touched (justification)
- TranslatePdf.tsx — uses bg-blue-50 status info box (intentional status color). No card pattern to upgrade.
- PdfToPdfA.tsx — same: status info boxes only (bg-blue-50, bg-amber-50).
- PdfToWord.tsx — minimal text layout, no card pattern. Adding chrome would degrade UX.

These three pages already have token-driven colors (Phase 3) and don't have a card container to upgrade. Visual polish would be subjective work that doesn't add measurable value at this scope.

## Acceptance
- 83/83 tests pass across the 12 polished files
- All card divs continue to use `bg-[var(--surface)]` (or `surface-2`) + `border-[var(--border)]` tokens
- The inner shadow uses token-driven color so it works in both light and dark themes
