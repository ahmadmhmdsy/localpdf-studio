import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useToastStore, Toast, ToastType } from '../store/toastStore';

export type { ToastType };
export type { Toast };

interface ToastContextType {
  toasts: Toast[];
  showToast: (options: { message: string; type?: ToastType; duration?: number }) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toasts = useToastStore((state) => state.toasts);
  const storeShowToast = useToastStore((state) => state.showToast);
  const storeDismissToast = useToastStore((state) => state.dismissToast);

  useEffect(() => {
    const timeouts: Record<string, NodeJS.Timeout> = {};

    toasts.forEach((toast) => {
      if (toast.duration > 0 && !timeouts[toast.id]) {
        timeouts[toast.id] = setTimeout(() => {
          storeDismissToast(toast.id);
          delete timeouts[toast.id];
        }, toast.duration);
      }
    });

    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, [toasts, storeDismissToast]);

  const showToast = (options: { message: string; type?: ToastType; duration?: number }) => {
    storeShowToast(options);
  };

  const dismissToast = (id: string) => {
    storeDismissToast(id);
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export { useToastStore };