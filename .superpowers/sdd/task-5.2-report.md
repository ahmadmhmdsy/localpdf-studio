# Task 5.2 — Viewport safe-area handling

## What
- `index.html`: added `viewport-fit=cover` to the viewport meta tag.
- `src/index.css`: added `--safe-top`, `--safe-bottom`, `--safe-left`, `--safe-right` design tokens (using `env(safe-area-inset-*, 0px)`).
- `src/index.css`: applied `padding-top: max(0.5rem, var(--safe-top))` to `header.fixed` and `padding-bottom: max(0.5rem, var(--safe-bottom))` to `footer`.

## Acceptance
- Build OK
- iOS Safari will respect safe-area insets (notch / home indicator).
- Desktop browsers unaffected (`env()` returns 0px when not supported).
- Manual smoke on iPhone emulator: header pill no longer sits under notch.
