import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentStore, useToolsStore, useAnnotationsStore } from '../store';
import { cn } from '../lib/utils';
import { useShallow } from 'zustand/react/shallow';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useToast } from '../contexts/ToastContext';
import Sidebar from '../components/editor/Sidebar';
import Canvas from '../components/editor/Canvas';
import Toolbar from '../components/editor/Toolbar';
import PropertiesPanel from '../components/editor/PropertiesPanel';
import FileUploadZone from '../components/tools/FileUploadZone';
import KeyboardShortcutsHelp from '../components/editor/KeyboardShortcutsHelp';
import { EditorEmptyState } from './editor/EditorEmptyState';
import { EditorWorkspace } from './editor/EditorWorkspace';

export default function Editor() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Use granular stores for better performance
  const { file, isLoading } = useDocumentStore(
    useShallow((state) => ({
      file: state.file,
      isLoading: state.isLoading,
    }))
  );

  const { loadFile } = useDocumentStore();

  const { zoom, setZoom, setActiveTool, togglePropertiesPanel } = useToolsStore(
    useShallow((state) => ({
      zoom: state.zoom,
      setZoom: state.setZoom,
      setActiveTool: state.setActiveTool,
      togglePropertiesPanel: state.togglePropertiesPanel,
    }))
  );

  const { undo, redo, deleteAnnotation, selectedAnnotationId } = useAnnotationsStore(
    useShallow((state) => ({
      undo: state.undo,
      redo: state.redo,
      deleteAnnotation: state.deleteAnnotation,
      selectedAnnotationId: state.selectedAnnotationId,
    }))
  );

  const { pages, setPages } = useDocumentStore(
    useShallow((state) => ({
      pages: state.pages,
      setPages: state.setPages,
    }))
  );
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  useEffect(() => {
    const toolParam = searchParams.get('tool');
    if (toolParam) {
      if (toolParam === 'edit-pdf') setActiveTool('text');
      else if (toolParam === 'add-watermark') setActiveTool('text');
      else if (toolParam === 'sign-pdf') setActiveTool('image');
      else if (toolParam === 'redact-pdf') setActiveTool('redact');
      else if (toolParam === 'crop-pdf') setActiveTool('crop');
      else setActiveTool('select');
    }
  }, [searchParams, setActiveTool]);

  // Use the keyboard shortcuts hook
  const keyboardShortcuts = useMemo(() => [
    // Undo/Redo
    { key: 'z', ctrl: true, handler: () => {
      const result = undo(pages);
      if (result) setPages(result.pages);
    }},
    { key: 'z', ctrl: true, shift: true, handler: () => {
      const result = redo(pages);
      if (result) setPages(result.pages);
    }},
    { key: 'y', ctrl: true, handler: () => {
      const result = redo(pages);
      if (result) setPages(result.pages);
    }},

    // Delete
    { key: 'Delete', handler: () => {
      if (selectedAnnotationId) deleteAnnotation(selectedAnnotationId, pages);
    }},
    { key: 'Backspace', handler: () => {
      if (selectedAnnotationId) deleteAnnotation(selectedAnnotationId, pages);
    }},

    // Zoom
    { key: '=', ctrl: true, handler: () => setZoom(zoom + 0.1) },
    { key: '+', ctrl: true, handler: () => setZoom(zoom + 0.1) },
    { key: '-', ctrl: true, handler: () => setZoom(zoom - 0.1) },

    // Tools
    { key: 'v', ctrl: true, handler: () => setActiveTool('select') },
    { key: 'h', ctrl: true, handler: () => setActiveTool('pan') },
    { key: 't', ctrl: true, handler: () => setActiveTool('text') },
    { key: 'd', ctrl: true, handler: () => setActiveTool('draw') },
    { key: 'i', ctrl: true, handler: () => setActiveTool('image') },
    { key: 'r', ctrl: true, handler: () => setActiveTool('redact') },
    { key: 'c', ctrl: true, handler: () => setActiveTool('crop') },
    { key: 's', ctrl: true, handler: () => setActiveTool('signature') },
    // Help
    { key: '/', shift: true, handler: () => setShowShortcuts((prev) => !prev) },
    { key: '?', handler: () => setShowShortcuts((prev) => !prev) },
    // Properties panel toggle (Ctrl+,)
    { key: ',', ctrl: true, handler: () => togglePropertiesPanel() },
  ], [undo, redo, pages, setPages, selectedAnnotationId, deleteAnnotation, zoom, setZoom, setActiveTool, setShowShortcuts, togglePropertiesPanel]);

  useKeyboardShortcuts(keyboardShortcuts);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    if (files.length > 1) {
      const ignored = files.length - 1;
      showToast({
        message: `Editor only opens one file at a time. Loaded "${files[0].name}"; ignored ${ignored} other ${ignored === 1 ? 'file' : 'files'}.`,
        type: 'info',
        duration: 6000,
      });
    }

    try {
      await loadFile(files[0]);
    } catch (error) {
      showToast({
        message: 'Failed to load PDF. Please try another file.',
        type: 'error',
        duration: 5000,
      });
    }
  };

  const skin = useToolsStore((s) => s.skin);
  // Bento skin: full-screen workspace (no floating header to subtract).
  // Glass skin: keep the original 64px top offset so the floating pill doesn't overlap content.
  const wrapperHeight = skin === 'bento' ? 'h-screen' : 'h-[calc(100vh-64px)]';

  return (
    <div className={cn('flex flex-col bg-[var(--bg)] overflow-hidden', wrapperHeight)}>
      {!file ? (
        <EditorEmptyState
          isLoading={isLoading}
          onFilesSelected={handleFilesSelected}
        />
      ) : (
        <EditorWorkspace />
      )}
      <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
