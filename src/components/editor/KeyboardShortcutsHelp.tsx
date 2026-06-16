import { X } from 'lucide-react';

interface ShortcutGroup {
  label: string;
  shortcuts: { keys: string; desc: string }[];
}

const groups: ShortcutGroup[] = [
  {
    label: 'Undo & Redo',
    shortcuts: [
      { keys: 'Ctrl+Z', desc: 'Undo' },
      { keys: 'Ctrl+Shift+Z', desc: 'Redo' },
      { keys: 'Ctrl+Y', desc: 'Redo (alternative)' },
    ],
  },
  {
    label: 'Editing',
    shortcuts: [
      { keys: 'Delete / Backspace', desc: 'Delete selected annotation' },
    ],
  },
  {
    label: 'Zoom',
    shortcuts: [
      { keys: 'Ctrl+= / Ctrl++', desc: 'Zoom in' },
      { keys: 'Ctrl+-', desc: 'Zoom out' },
    ],
  },
  {
    label: 'View',
    shortcuts: [
      { keys: 'Ctrl+,', desc: 'Toggle properties panel' },
    ],
  },
  {
    label: 'Tools',
    shortcuts: [
      { keys: 'V', desc: 'Select tool' },
      { keys: 'H', desc: 'Pan tool' },
      { keys: 'T', desc: 'Text tool' },
      { keys: 'D', desc: 'Draw tool' },
      { keys: 'I', desc: 'Image tool' },
      { keys: 'R', desc: 'Redact tool' },
      { keys: 'C', desc: 'Crop tool' },
      { keys: 'S', desc: 'Signature tool' },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close shortcuts"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {group.label}
              </h4>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600">{shortcut.desc}</span>
                    <kbd className="px-2 py-0.5 text-xs font-mono font-medium bg-gray-100 text-gray-700 rounded border border-gray-200">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            Press <kbd className="px-1 py-0.5 text-xs font-mono bg-gray-100 rounded border border-gray-200">?</kbd> to toggle this dialog
          </p>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
