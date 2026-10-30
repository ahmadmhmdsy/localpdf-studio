import { X } from 'lucide-react';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n/useI18n';

interface ShortcutGroup {
  label: MessageKey;
  shortcuts: { keys: string; desc: MessageKey }[];
}

const groups: ShortcutGroup[] = [
  {
    label: 'editor.shortcuts.group.history',
    shortcuts: [
      { keys: 'Ctrl+Z', desc: 'editor.shortcuts.undo' },
      { keys: 'Ctrl+Shift+Z', desc: 'editor.shortcuts.redo' },
      { keys: 'Ctrl+Y', desc: 'editor.shortcuts.redoAlt' },
    ],
  },
  {
    label: 'editor.shortcuts.group.editing',
    shortcuts: [
      { keys: 'Delete / Backspace', desc: 'editor.shortcuts.deleteAnnotation' },
    ],
  },
  {
    label: 'editor.shortcuts.group.zoom',
    shortcuts: [
      { keys: 'Ctrl+= / Ctrl++', desc: 'editor.shortcuts.zoomIn' },
      { keys: 'Ctrl+-', desc: 'editor.shortcuts.zoomOut' },
    ],
  },
  {
    label: 'editor.shortcuts.group.view',
    shortcuts: [
      { keys: 'Ctrl+,', desc: 'editor.shortcuts.toggleProperties' },
    ],
  },
  {
    label: 'editor.shortcuts.group.tools',
    shortcuts: [
      { keys: 'Ctrl+V', desc: 'editor.shortcuts.selectTool' },
      { keys: 'Ctrl+H', desc: 'editor.shortcuts.panTool' },
      { keys: 'Ctrl+T', desc: 'editor.shortcuts.textTool' },
      { keys: 'Ctrl+D', desc: 'editor.shortcuts.drawTool' },
      { keys: 'Ctrl+I', desc: 'editor.shortcuts.imageTool' },
      { keys: 'Ctrl+C', desc: 'editor.shortcuts.cropTool' },
      { keys: 'Ctrl+S', desc: 'editor.shortcuts.signatureTool' },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('editor.shortcuts.dialog')}
    >
      <div className="bg-[var(--surface)] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text)]">{t('editor.shortcuts.title')}</h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-3)] hover:text-[var(--text-2)] rounded-full hover:bg-[var(--surface-2)] transition-colors"
            aria-label={t('editor.shortcuts.close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <h4 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
                {t(group.label)}
              </h4>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between py-1">
                    <span className="text-sm text-[var(--text-2)]">{t(shortcut.desc)}</span>
                    <kbd className="px-2 py-0.5 text-xs font-mono font-medium bg-[var(--surface-2)] text-[var(--text-2)] rounded border border-[var(--border)]">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-[var(--text-3)] pt-2 border-t border-[var(--border)]">
            {t('editor.shortcuts.togglePrefix')} <kbd className="px-1 py-0.5 text-xs font-mono bg-[var(--surface-2)] rounded border border-[var(--border)]">?</kbd> {t('editor.shortcuts.toggleSuffix')}
          </p>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
          >
            {t('confirm.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
