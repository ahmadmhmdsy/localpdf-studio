import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from './toastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.getState().reset();
  });

  describe('showToast', () => {
    it('adds a toast with defaults (info type, 5000ms duration)', () => {
      useToastStore.getState().showToast({ message: 'hello' });
      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('hello');
      expect(toasts[0].type).toBe('info');
      expect(toasts[0].duration).toBe(5000);
      expect(toasts[0].id).toMatch(/^toast-\d+$/);
    });

    it('respects explicit type and duration', () => {
      useToastStore.getState().showToast({ message: 'oops', type: 'error', duration: 2000 });
      const t = useToastStore.getState().toasts[0];
      expect(t.type).toBe('error');
      expect(t.duration).toBe(2000);
    });

    it('appends rather than replaces existing toasts', () => {
      useToastStore.getState().showToast({ message: 'one' });
      useToastStore.getState().showToast({ message: 'two' });
      useToastStore.getState().showToast({ message: 'three' });
      const messages = useToastStore.getState().toasts.map((t) => t.message);
      expect(messages).toEqual(['one', 'two', 'three']);
    });

    it('assigns monotonically increasing IDs', () => {
      useToastStore.getState().showToast({ message: 'a' });
      useToastStore.getState().showToast({ message: 'b' });
      const ids = useToastStore.getState().toasts.map((t) => Number(t.id.split('-')[1]));
      expect(ids[1]).toBeGreaterThan(ids[0]);
    });
  });

  describe('dismissToast', () => {
    it('removes the toast with the matching ID', () => {
      useToastStore.getState().showToast({ message: 'keep' });
      useToastStore.getState().showToast({ message: 'remove' });
      const removeId = useToastStore.getState().toasts[1].id;
      useToastStore.getState().dismissToast(removeId);
      const remaining = useToastStore.getState().toasts.map((t) => t.message);
      expect(remaining).toEqual(['keep']);
    });

    it('is a no-op when the ID does not exist', () => {
      useToastStore.getState().showToast({ message: 'still here' });
      useToastStore.getState().dismissToast('toast-nonexistent');
      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('clears all toasts', () => {
      useToastStore.getState().showToast({ message: 'a' });
      useToastStore.getState().showToast({ message: 'b' });
      useToastStore.getState().reset();
      expect(useToastStore.getState().toasts).toEqual([]);
    });
  });
});