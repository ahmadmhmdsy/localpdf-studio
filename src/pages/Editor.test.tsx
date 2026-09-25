import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Editor from './Editor';
import * as StoreModule from '../store';
import * as ToastContextModule from '../contexts/ToastContext';

const shortcutCapture = vi.hoisted(() => ({
  current: [] as Array<{ key: string; ctrl?: boolean; handler: () => void }>,
}));

vi.mock('../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn((shortcuts) => {
    shortcutCapture.current = shortcuts;
  }),
}));

vi.mock('./editor/EditorWorkspace', () => ({
  EditorWorkspace: () => <div data-testid="editor-workspace" />,
}));
vi.mock('./editor/EditorEmptyState', () => ({
  EditorEmptyState: () => <div data-testid="editor-empty-state" />,
}));
vi.mock('../components/editor/Sidebar', () => ({
  default: () => <div data-testid="sidebar" />,
}));
vi.mock('../components/editor/Canvas', () => ({
  default: () => <div data-testid="canvas" />,
}));
vi.mock('../components/editor/Toolbar', () => ({
  default: () => <div data-testid="toolbar" />,
}));
vi.mock('../components/editor/PropertiesPanel', () => ({
  default: () => <div data-testid="properties-panel" />,
}));
vi.mock('../components/tools/FileUploadZone', () => ({
  default: () => <div data-testid="file-upload-zone" />,
}));
vi.mock('../components/editor/KeyboardShortcutsHelp', () => ({
  default: () => null,
}));

describe('Editor redaction quarantine', () => {
  let setActiveTool = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    shortcutCapture.current = [];
    setActiveTool = vi.fn();

    vi.spyOn(StoreModule, 'useDocumentStore').mockReturnValue({
      file: null,
      isLoading: false,
      loadFile: vi.fn(),
      pages: [],
      setPages: vi.fn(),
    } as any);
    vi.spyOn(StoreModule, 'useToolsStore').mockReturnValue({
      zoom: 1,
      setZoom: vi.fn(),
      setActiveTool,
      togglePropertiesPanel: vi.fn(),
      skin: 'glass',
    } as any);
    vi.spyOn(StoreModule, 'useAnnotationsStore').mockReturnValue({
      undo: vi.fn(),
      redo: vi.fn(),
      deleteAnnotation: vi.fn(),
      selectedAnnotationId: null,
    } as any);
    vi.spyOn(ToastContextModule, 'useToast').mockReturnValue({
      showToast: vi.fn(),
    } as any);
  });

  function renderEditor(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Editor />
      </MemoryRouter>,
    );
  }

  it('does not activate redaction from the legacy query or Ctrl+R shortcut', async () => {
    renderEditor('/editor?tool=redact-pdf');

    await waitFor(() => expect(setActiveTool).toHaveBeenCalled());
    expect(setActiveTool).not.toHaveBeenCalledWith('redact');

    const shortcut = shortcutCapture.current.find(
      (entry) => entry.key === 'r' && entry.ctrl,
    );
    expect(shortcut).toBeUndefined();
  });

  it('preserves the unrelated crop query mapping', async () => {
    renderEditor('/editor?tool=crop-pdf');

    await waitFor(() => expect(setActiveTool).toHaveBeenCalledWith('crop'));
  });
});
