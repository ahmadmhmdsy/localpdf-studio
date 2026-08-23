import { Download } from 'lucide-react';

interface ExportButtonsProps {
  isExporting: boolean;
  disabled: boolean;
  onExportCurrentPage: () => void;
  onExportAll: () => void;
}

export function ExportButtons({
  isExporting,
  disabled,
  onExportCurrentPage,
  onExportAll,
}: ExportButtonsProps) {
  return (
    <>
      <button
        onClick={onExportCurrentPage}
        disabled={isExporting || disabled}
        className="flex items-center gap-2 bg-[var(--surface-2)] hover:bg-[var(--surface-2)] disabled:bg-[var(--surface-2)] text-[var(--text-2)] px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
      >
        {isExporting ? (
          <div className="w-4 h-4 border-2 border-[var(--border)] border-t-transparent rounded-full animate-spin" />
        ) : (
          <Download size={16} />
        )}
        Export Page
      </button>
      <button
        onClick={onExportAll}
        disabled={isExporting || disabled}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
      >
        {isExporting ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Download size={16} />
        )}
        {isExporting ? 'Exporting...' : 'Export All'}
      </button>
    </>
  );
}
