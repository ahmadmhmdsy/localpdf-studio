import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Palette } from 'lucide-react';
import { useSkin } from '../../theme';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { cn } from '../../lib/utils';

/**
 * Compact dropdown that lets the user switch the active skin (visual layout).
 * Renders the current skin's label in the trigger and a menu of all registered
 * skins with their hints. Pairs with the .skin-picker CSS in
 * src/theme/skins/picker.css — that stylesheet defines the menu visuals so the
 * picker looks consistent with the design system rather than ad-hoc Tailwind.
 *
 * Accessibility:
 *   - trigger: aria-haspopup="menu", aria-expanded
 *   - menu: role="menu"
 *   - items: role="menuitem", aria-pressed for the active one
 *   - keyboard: Tab trapped inside while open (useFocusTrap), Escape closes
 *   - outside click closes
 */
export default function SkinPicker() {
  const { id, definition, all, setSkin } = useSkin();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useFocusTrap<HTMLDivElement>(open);

  const close = useCallback(() => setOpen(false), []);

  // Close on Escape — focus trap doesn't handle Escape by itself.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  const handleSelect = useCallback(
    (next: typeof id) => {
      setSkin(next);
      close();
    },
    [setSkin, close]
  );

  return (
    <div
      ref={rootRef}
      className="skin-picker"
      data-open={open ? 'true' : 'false'}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Change skin (current: ${definition.label})`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-9 px-3 rounded-lg transition-colors"
        style={{
          background: 'var(--surface-2)',
          color: 'var(--text-2)',
          fontFamily: 'inherit',
          fontSize: '13px',
          fontWeight: 500,
          border: '1px solid transparent',
          cursor: 'pointer',
        }}
      >
        <Palette size={16} aria-hidden="true" />
        <span>{definition.label}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          style={{
            transition: 'transform 150ms',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="menu"
          role="menu"
          aria-label="Choose a skin"
          data-testid="skin-picker-menu"
        >
          {all.map((skin) => {
            const isActive = skin.id === id;
            return (
              <button
                key={skin.id}
                type="button"
                role="menuitem"
                aria-pressed={isActive}
                onClick={() => handleSelect(skin.id)}
                data-testid={`skin-picker-option-${skin.id}`}
                className={cn('menu-item')}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                  <span style={{ fontWeight: 500 }}>{skin.label}</span>
                  <span className="hint">{skin.hint}</span>
                </span>
                {isActive && <Check size={16} className="check" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
