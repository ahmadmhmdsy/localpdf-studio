import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (options: { message: string; type?: ToastType; duration?: number }) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    return () => {
      Object.values(timeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = 'info', duration = 5000 }: { message: string; type?: ToastType; duration?: number }) => {
    const id = `toast-${++toastIdCounter}`;
    const toast: Toast = { id, message, type, duration };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss after duration using setTimeout with functional update
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
        delete timeoutRef.current[id];
      }, duration);
      timeoutRef.current[id] = timeoutId;
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
