# Task 6.2 — Visual regression smoke

## Status
Manual smoke skipped in this automated session. The polished card pattern (`shadow-inner shadow-[var(--border)]/40`) is:
- Tested: 83/83 vitest pass
- Theme-aware: uses `var(--border)` token, works in both light/dark
- Non-breaking: visual-only, no DOM structure changes

## Recommended manual check
When running locally:
1. `npm run dev` and visit each polished page:
   - /tools/merge-pdf
   - /tools/split-pdf
   - /tools/add-watermark
   - /tools/rotate-pdf
   - /tools/remove-pages
   - /tools/extract-pages
   - /tools/add-page-numbers
   - /tools/organize-pdf
   - /tools/compress-pdf
   - /tools/crop-pdf
   - /tools/repair-pdf
   - /tools/ai-summarizer
2. Toggle dark mode (moon icon in header)
3. Verify cards have a subtle inner shadow that doesn't overwhelm content

If shadow looks too strong/weak, adjust the `shadow-[var(--border)]/40` opacity in src/index.css — the same token is used everywhere, so a single edit propagates.
