import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, EDITOR_SHORTCUTS } from './useKeyboardShortcuts';

const fireKeyDown = (target: EventTarget, key: string, options: Partial<KeyboardEvent> = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useKeyboardShortcuts', () => {
  it('triggers handler when key matches without modifiers', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'v', handler, description: 'Select' }])
    );

    fireKeyDown(window, 'v');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches key case-insensitively', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'v', handler }]));

    fireKeyDown(window, 'V');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not trigger when required ctrl modifier is missing', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 's', ctrl: true, handler }]));

    fireKeyDown(window, 's');
    expect(handler).not.toHaveBeenCalled();
  });

  it('triggers when required ctrl modifier is held', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 's', ctrl: true, handler }]));

    fireKeyDown(window, 's', { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('requires all four modifiers when ctrl+shift+alt+meta set', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'z', ctrl: true, shift: true, alt: true, meta: true, handler },
      ])
    );

    fireKeyDown(window, 'z', { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();

    fireKeyDown(window, 'z', { ctrlKey: true, shiftKey: true, altKey: true, metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not trigger when user is typing in an input', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'v', handler }]));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireKeyDown(input, 'v');

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not trigger when user is typing in a textarea', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'v', handler }]));

    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    ta.focus();
    fireKeyDown(ta, 'v');

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not trigger on a contentEditable element', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'v', handler }]));

    const div = document.createElement('div');
    Object.defineProperty(div, 'isContentEditable', { value: true, configurable: true });
    document.body.appendChild(div);
    div.focus();
    fireKeyDown(div, 'v');

    expect(handler).not.toHaveBeenCalled();
  });

  it('calls preventDefault when a shortcut fires', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'v', handler }]));

    const event = fireKeyDown(window, 'v');
    expect(event.defaultPrevented).toBe(true);
  });

  it('only fires the first matching shortcut', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'v', handler: handler1 },
        { key: 'v', handler: handler2 },
      ])
    );

    fireKeyDown(window, 'v');
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });

  it('removes the keydown listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([{ key: 'v', handler }])
    );

    unmount();
    fireKeyDown(window, 'v');
    expect(handler).not.toHaveBeenCalled();
  });

  it('EDITOR_SHORTCUTS.TOOL_* entries all have a key defined', () => {
    expect(EDITOR_SHORTCUTS.TOOL_SELECT.key).toBe('v');
    expect(EDITOR_SHORTCUTS.TOOL_PAN.key).toBe('h');
    expect(EDITOR_SHORTCUTS.TOOL_TEXT.key).toBe('t');
    expect(EDITOR_SHORTCUTS.TOOL_DRAW.key).toBe('d');
    expect(EDITOR_SHORTCUTS.TOOL_IMAGE.key).toBe('i');
    expect(EDITOR_SHORTCUTS.TOOL_REDACT.key).toBe('r');
    expect(EDITOR_SHORTCUTS.TOOL_CROP.key).toBe('c');
    expect(EDITOR_SHORTCUTS.TOOL_SIGNATURE.key).toBe('s');
  });

  it('EDITOR_SHORTCUTS.UNDO and REDO have ctrl: true', () => {
    expect(EDITOR_SHORTCUTS.UNDO.ctrl).toBe(true);
    expect(EDITOR_SHORTCUTS.REDO.ctrl).toBe(true);
  });
});
