import { create } from 'zustand';
import { ToastType } from '../contexts/ToastContext';

interface ToastState {
  toasts: Toast[];
  showToast: (options: { message: string; type?: ToastType; duration?: number }) => void;
  dismissToast: (id: string) => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

let toastIdCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: ({ message, type = 'info', duration = 5000 }) => {
    const id = `toast-${++toastIdCounter}`;
    const toast: Toast = { id, message, type, duration };
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));