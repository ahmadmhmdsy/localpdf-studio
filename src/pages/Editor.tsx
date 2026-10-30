import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentStore, useToolsStore, useAnnotationsStore } from '../store';
import { cn } from '../lib/utils';
import { useShallow } from 'zustand/react/shallow';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n/useI18n';

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
  const { t } = useI18n();

  // Use refs for values that change frequently to avoid re-creating handlers
  const pagesRef = useRef(pages);
  const zoomRef = useRef(zoom);
  const selectedAnnotationIdRef = useRef(selectedAnnotationId);

  // Stable callback refs
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  const setPagesRef = useRef(setPages);
  const deleteAnnotationRef = useRef(deleteAnnotation);
  const setZoomRef = useRef(setZoom);
  const setActiveToolRef = useRef(setActiveTool);
  const togglePropertiesPanelRef = useRef(togglePropertiesPanel);

  // Update refs in effect to avoid assigning during render
  useEffect(() => {
    pagesRef.current = pages;
    zoomRef.current = zoom;
    selectedAnnotationIdRef.current = selectedAnnotationId;
    undoRef.current = undo;
    redoRef.current = redo;
    setPagesRef.current = setPages;
    deleteAnnotationRef.current = deleteAnnotation;
    setZoomRef.current = setZoom;
    setActiveToolRef.current = setActiveTool;
    togglePropertiesPanelRef.current = togglePropertiesPanel;
  }, [pages, zoom, selectedAnnotationId, undo, redo, setPages, deleteAnnotation, setZoom, setActiveTool, togglePropertiesPanel]);

  useEffect(() => {
    const toolParam = searchParams.get('tool');
    if (toolParam) {
      if (toolParam === 'edit-pdf') setActiveTool('text');
      else if (toolParam === 'add-watermark') setActiveTool('text');
      else if (toolParam === 'sign-pdf') setActiveTool('image');
      else if (toolParam === 'crop-pdf') setActiveTool('crop');
      else setActiveTool('select');
    }
  }, [searchParams, setActiveTool]);

  // Keyboard shortcuts with stable handlers using refs
  const keyboardShortcuts = useMemo(() => [
    // Undo/Redo
    { key: 'z', ctrl: true, handler: () => {
      const result = undoRef.current(pagesRef.current);
      if (result) setPagesRef.current(result.pages);
    }},
    { key: 'z', ctrl: true, shift: true, handler: () => {
      const result = redoRef.current(pagesRef.current);
      if (result) setPagesRef.current(result.pages);
    }},
    { key: 'y', ctrl: true, handler: () => {
      const result = redoRef.current(pagesRef.current);
      if (result) setPagesRef.current(result.pages);
    }},

    // Delete
    { key: 'Delete', handler: () => {
      if (selectedAnnotationIdRef.current) deleteAnnotationRef.current(selectedAnnotationIdRef.current, pagesRef.current);
    }},
    { key: 'Backspace', handler: () => {
      if (selectedAnnotationIdRef.current) deleteAnnotationRef.current(selectedAnnotationIdRef.current, pagesRef.current);
    }},

    // Zoom
    { key: '=', ctrl: true, handler: () => setZoomRef.current(zoomRef.current + 0.1) },
    { key: '+', ctrl: true, handler: () => setZoomRef.current(zoomRef.current + 0.1) },
    { key: '-', ctrl: true, handler: () => setZoomRef.current(zoomRef.current - 0.1) },

    // Tools
    { key: 'v', ctrl: true, handler: () => setActiveToolRef.current('select') },
    { key: 'h', ctrl: true, handler: () => setActiveToolRef.current('pan') },
    { key: 't', ctrl: true, handler: () => setActiveToolRef.current('text') },
    { key: 'd', ctrl: true, handler: () => setActiveToolRef.current('draw') },
    { key: 'i', ctrl: true, handler: () => setActiveToolRef.current('image') },
    { key: 'c', ctrl: true, handler: () => setActiveToolRef.current('crop') },
    { key: 's', ctrl: true, handler: () => setActiveToolRef.current('signature') },
    // Help
    { key: '/', shift: true, handler: () => setShowShortcuts((prev) => !prev) },
    { key: '?', handler: () => setShowShortcuts((prev) => !prev) },
    // Properties panel toggle (Ctrl+,)
    { key: ',', ctrl: true, handler: () => togglePropertiesPanelRef.current() },
  ], []); // Empty deps - handlers use refs for latest values

  useKeyboardShortcuts(keyboardShortcuts);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    if (files.length > 1) {
      const ignored = files.length - 1;
      showToast({
        message: t('editor.load.oneFileOnly', { name: files[0].name, count: ignored }),
        type: 'info',
        duration: 6000,
      });
    }

    try {
      await loadFile(files[0]);
    } catch {
      showToast({
        message: t('editor.load.failed'),
        type: 'error',
        duration: 5000,
      });
    }
  }, [loadFile, showToast, t]);

  const skin = useToolsStore((s) => s.skin);
  const wrapperHeight = skin === 'bento' ? 'h-screen' : 'h-[calc(100vh-var(--glass-header-offset))]';

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
