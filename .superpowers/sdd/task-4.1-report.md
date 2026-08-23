# Task 4.1 — ConfirmModal focus trap

## What
- New hook: `src/hooks/useFocusTrap.ts` (~60 lines). Generic focus trap with auto-restore.
- Modified: `src/components/ui/ConfirmModal.tsx` — wired `useFocusTrap(isOpen)` to the dialog div, removed manual focus logic.
- Modified: `src/components/ui/ConfirmModal.test.tsx` — updated existing focus test, added 5 new a11y tests (14 -> 19 total).

## Behavior
- Initial focus: first focusable element in trap (close button). Safer than focusing confirm.
- Tab from last element wraps to first.
- Shift+Tab from first wraps to last.
- Escape closes (handler on dialog div).
- On close: focus returns to whichever element was focused before open.

## Acceptance
- 19/19 tests pass
- Tab/Shift+Tab cycling verified by 3 dedicated tests
- Focus restoration verified by Harness component test
- Escape behavior preserved (test #7)

## Notes
- Did NOT add `focus-trap-react` dependency — the 60-line hook is sufficient and adds zero deps.
- Enter key on focused button is handled by the button's native click semantics; no longer intercept Enter on dialog.
- Existing test that asserted confirm button gets initial focus was updated to assert first focusable (close button) — this is the safer a11y pattern.
