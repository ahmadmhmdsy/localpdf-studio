import { Undo, Redo } from 'lucide-react';

interface HistoryControlsProps {
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryControls({ onUndo, onRedo }: HistoryControlsProps) {
  return (
    <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
      <button
        onClick={onUndo}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
        aria-label="Undo (Ctrl+Z)"
      >
        <Undo size={18} />
      </button>
      <button
        onClick={onRedo}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Y)"
        aria-label="Redo (Ctrl+Y)"
      >
        <Redo size={18} />
      </button>
    </div>
  );
}
