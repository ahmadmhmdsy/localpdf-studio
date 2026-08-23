# Task 5.1 — Header mobile drawer

## What
- `src/components/layout/Header.tsx` rewritten with mobile-first behavior:
  - Hamburger button (`md:hidden`) toggles drawer state
  - Drawer (`md:hidden`) is a full-screen dialog containing nav links
  - Drawer uses `useFocusTrap` hook from Task 4.1 (focus trapped when open, restored to hamburger on close)
  - Desktop nav (`hidden md:flex`) retains the original pill layout
  - Brand text hidden below `sm` to save pill space
- `src/components/layout/Header.test.tsx` extended: 6 → 12 tests.

## Acceptance
- 12/12 Header tests pass
- Hamburger present with `aria-expanded`, `aria-controls="mobile-nav"`
- Drawer is `role="dialog" aria-modal="true"` when open
- Clicking close button or any drawer link closes the drawer
- Focus trap active while drawer open
- Tailwind breakpoint: `<768px` shows drawer control, `≥768px` shows full nav
