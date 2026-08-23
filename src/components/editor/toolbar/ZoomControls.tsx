import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-2 border-r border-[var(--border)] pr-4">
      <button
        onClick={onZoomOut}
        className="p-2 text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-md transition-colors"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <ZoomOut size={18} />
      </button>
      <span className="text-sm font-medium w-12 text-center text-[var(--text-2)]">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="p-2 text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-md transition-colors"
        title="Zoom In"
        aria-label="Zoom In"
      >
        <ZoomIn size={18} />
      </button>
      <button
        onClick={onFit}
        className="p-2 text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-md transition-colors ml-1"
        title="Fit to Page"
        aria-label="Fit to Page"
      >
        <Maximize size={18} />
      </button>
    </div>
  );
}
