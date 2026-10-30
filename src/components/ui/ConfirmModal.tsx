import { AlertTriangle, X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useI18n } from '../../i18n/useI18n';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  const { t } = useI18n();

  // Enter on the focused element calls its handler (Confirm/Cancel buttons handle their own clicks).
  // Escape is handled here at the dialog level so it works regardless of focus position.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  };

  if (!isOpen) return null;

  const accentClass =
    variant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
    variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-[var(--surface)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
              <p className="text-sm text-[var(--text-2)] mt-1 whitespace-pre-wrap">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="flex-shrink-0 p-1 text-[var(--text-3)] hover:text-[var(--text-2)] rounded-full hover:bg-[var(--surface-2)] transition-colors"
              aria-label={t('confirm.close')}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="px-4 py-3 bg-[var(--surface-2)] border-t border-[var(--border)] flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--text-2)] bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          >
            {cancelLabel ?? t('confirm.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${accentClass}`}
          >
            {confirmLabel ?? t('confirm.proceed')}
          </button>
        </div>
      </div>
    </div>
  );
}
