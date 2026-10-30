import { Undo, Redo } from 'lucide-react';
import { useI18n } from '../../../i18n/useI18n';

interface HistoryControlsProps {
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryControls({ onUndo, onRedo }: HistoryControlsProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 border-e border-[var(--border)] pe-4">
      <button
        onClick={onUndo}
        className="p-2 min-w-[44px] min-h-[44px] text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={t('editor.toolbar.undo')}
        aria-label={t('editor.toolbar.undo')}
      >
        <Undo size={18} />
      </button>
      <button
        onClick={onRedo}
        className="p-2 min-w-[44px] min-h-[44px] text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={t('editor.toolbar.redo')}
        aria-label={t('editor.toolbar.redo')}
      >
        <Redo size={18} />
      </button>
    </div>
  );
}
