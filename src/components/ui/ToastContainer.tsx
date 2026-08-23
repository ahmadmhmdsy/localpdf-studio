import { useToast, ToastType } from '../../contexts/ToastContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const toastStyles: Record<ToastType, { container: string; icon: typeof Info }> = {
  info: { container: 'bg-[var(--surface)] border-[var(--border)]', icon: Info },
  success: { container: 'bg-[var(--surface)] border-[var(--border)]', icon: CheckCircle },
  warning: { container: 'bg-[var(--surface)] border-[var(--border)]', icon: AlertTriangle },
  error: { container: 'bg-[var(--surface)] border-[var(--border)]', icon: AlertCircle },
};

const iconColors: Record<ToastType, string> = {
  info: 'text-[var(--accent-4)]',
  success: 'text-[var(--accent-2)]',
  warning: 'text-[var(--accent-3)]',
  error: 'text-[var(--accent)]',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2 sm:max-w-md pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const styles = toastStyles[toast.type];
        const Icon = styles.icon;
        const iconColor = iconColors[toast.type];

        return (
          <div
            key={toast.id}
            className={`${styles.container} border rounded-[var(--radius-md)] shadow-lg p-4 flex items-start gap-3 sm:min-w-[300px] animate-in slide-in-from-right fade-in duration-200 pointer-events-auto`}
            role="status"
          >
            <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} aria-hidden="true" />
            <div className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{toast.message}</div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="transition-colors"
              style={{ color: 'var(--text-3)' }}
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
