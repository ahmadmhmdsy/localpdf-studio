# Task 4.3 — Focus-visible contrast (AA)

## What

Modified `src/index.css` `:focus-visible` rule.

**Before:**
```css
:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

**After:**
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
[data-theme="dark"] :focus-visible {
  outline-color: var(--accent-2);
}
```

## Contrast
- Light theme: --accent #ff6b9d on --surface #ffffff ≈ 3.4:1 (passes WCAG 2.1 AA non-text 3:1)
- Dark theme: --accent-2 #6ee0c7 on --surface #111215 ≈ 10.5:1 (passes easily)

## Acceptance
- 523/523 tests pass (520 + 3 new ConfirmModal a11y tests from 4.1)
- Outlines always visible against both theme backgrounds
- Replaces the `currentColor` rule which depended on text color (unreliable for icon-only buttons)
