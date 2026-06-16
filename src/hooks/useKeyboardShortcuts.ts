import { useEffect, useCallback } from 'react';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts if user is typing in an input or textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement).isContentEditable
    ) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    for (const shortcut of shortcuts) {
      const needsCtrl = shortcut.ctrl ?? false;
      const needsShift = shortcut.shift ?? false;
      const needsAlt = shortcut.alt ?? false;
      const needsMeta = shortcut.meta ?? false;

      const ctrlPressed = isMac ? e.metaKey : e.ctrlKey;
      const hasCtrl = needsCtrl === ctrlPressed;
      const hasShift = needsShift === e.shiftKey;
      const hasAlt = needsAlt === e.altKey;
      const hasMeta = needsMeta === e.metaKey;

      const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (keyMatches && hasCtrl && hasShift && hasAlt && hasMeta) {
        e.preventDefault();
        shortcut.handler();
        return; // Only execute the first matching shortcut
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Predefined shortcuts for the PDF editor
export const EDITOR_SHORTCUTS = {
  // Undo/Redo
  UNDO: { key: 'z', ctrl: true, description: 'Undo last action' },
  REDO: { key: 'y', ctrl: true, description: 'Redo last action' },
  REDO_ALT: { key: 'z', ctrl: true, shift: true, description: 'Redo last action (alternative)' },

  // Zoom
  ZOOM_IN: { key: '=', ctrl: true, description: 'Zoom in' },
  ZOOM_OUT: { key: '-', ctrl: true, description: 'Zoom out' },
  ZOOM_FIT: { key: '0', ctrl: true, description: 'Fit to page' },

  // Tools
  TOOL_SELECT: { key: 'v', description: 'Select tool' },
  TOOL_PAN: { key: 'h', description: 'Pan tool' },
  TOOL_TEXT: { key: 't', description: 'Text tool' },
  TOOL_DRAW: { key: 'd', description: 'Draw tool' },
  TOOL_IMAGE: { key: 'i', description: 'Image tool' },
  TOOL_REDACT: { key: 'r', description: 'Redact tool' },
  TOOL_CROP: { key: 'c', description: 'Crop tool' },
  TOOL_SIGNATURE: { key: 's', description: 'Signature tool' },

  // Actions
  DELETE: { key: 'Delete', description: 'Delete selected' },
  DELETE_ALT: { key: 'Backspace', description: 'Delete selected (alternative)' },
} as const;
