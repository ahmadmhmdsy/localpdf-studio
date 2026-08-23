import { useEffect, useRef } from 'react';

/**
 * Selector for focusable elements per HTML spec.
 * Excludes disabled controls and elements with tabindex=-1.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab focus within the returned ref while active is true.
 * Also restores focus to the previously-focused element on cleanup.
 *
 * Usage:
 *   const dialogRef = useFocusTrap(isOpen);
 *   <div ref={dialogRef} role="dialog" aria-modal="true">...</div>
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;

    const root = ref.current;
    if (!root) return;

    // Move initial focus into the trap.
    const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (items.length > 0) {
      items[0].focus();
    } else {
      root.setAttribute('tabindex', '-1');
      root.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey && activeEl === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && activeEl === last) {
        first.focus();
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [active]);

  return ref;
}
