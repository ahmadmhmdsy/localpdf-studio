import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useI18n } from '../../../i18n/useI18n';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 border-e border-[var(--border)] pe-4">
      <button
        onClick={onZoomOut}
        className="p-2 min-w-[44px] min-h-[44px] text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-md transition-colors"
        title={t('editor.zoom.out')}
        aria-label={t('editor.zoom.out')}
      >
        <ZoomOut size={18} />
      </button>
      <span className="text-sm font-medium w-12 text-center text-[var(--text-2)]">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="p-2 min-w-[44px] min-h-[44px] text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-md transition-colors"
        title={t('editor.zoom.in')}
        aria-label={t('editor.zoom.in')}
      >
        <ZoomIn size={18} />
      </button>
      <button
        onClick={onFit}
        className="p-2 min-w-[44px] min-h-[44px] text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-md transition-colors ml-1"
        title={t('editor.zoom.fit')}
        aria-label={t('editor.zoom.fit')}
      >
        <Maximize size={18} />
      </button>
    </div>
  );
}
