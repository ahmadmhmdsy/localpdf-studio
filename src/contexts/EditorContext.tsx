import React, { ReactNode, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { pdfjsLib } from '../lib/pdfjs';
import { get } from 'idb-keyval';
import { useDocumentStore } from '../store/documentStore';
import { useToolsStore } from '../store/toolsStore';
import { useAnnotationsStore } from '../store/annotationsStore';
import { logError } from '../lib/logger';

export interface PageMeta {
  id: string;
  originalIndex: number;
  rotation: number;
}

export interface TextAnnotation {
  id: string;
  pageId: string;
  type: 'text';
  text: string;
  x: number; // 0 to 1 (percentage of width)
  y: number; // 0 to 1 (percentage of height)
  fontSize: number;
  color: string;
  opacity?: number;
  rotation?: number;
}

export interface ImageAnnotation {
  id: string;
  pageId: string;
  type: 'image';
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  rotation?: number;
}

export interface RedactAnnotation {
  id: string;
  pageId: string;
  type: 'redact';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface CropAnnotation {
  id: string;
  pageId: string;
  type: 'crop';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawAnnotation {
  id: string;
  pageId: string;
  type: 'draw';
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity?: number;
}

export type Annotation = TextAnnotation | ImageAnnotation | RedactAnnotation | CropAnnotation | DrawAnnotation;

/** Persists editor state (file buffer, annotations history) to IndexedDB.
 *  On mount, restores the previous session from IndexedDB if available.
 *  Uses `idb-keyval` for simple key-value storage. Data persists across
 *  browser sessions until cleared (no automatic expiry). */
export function EditorProvider({ children }: { children: ReactNode }) {
  const setDocument = useDocumentStore(state => state.setFile);
  const setPdfDocs = useDocumentStore(state => state.setPdfDocs);
  const setPages = useDocumentStore(state => state.setPages);
  const setIsLoading = useDocumentStore(state => state.setIsLoading);
  const resetTools = useToolsStore(state => state.resetTools);
  const loadHistory = useAnnotationsStore(state => state.loadHistory);

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadFromDB = async () => {
      try {
        const savedFileBuffer = await get('editor-file-buffer');
        const savedFileName = await get('editor-file-name');
        const savedFileType = await get('editor-file-type');
        const savedHistory = await get('editor-history');
        const savedHistoryIndex = await get('editor-history-index');

        if (savedFileBuffer && savedFileName && savedFileType) {
          const file = new File([savedFileBuffer], savedFileName, { type: savedFileType });
          setIsLoading(true);
          setDocument(file);

          const pdfLibDoc = await PDFDocument.load(savedFileBuffer);
          const pdfJsDoc = await pdfjsLib.getDocument({ data: savedFileBuffer }).promise;

          let initialPages: PageMeta[] = [];
          if (savedHistory && savedHistory.length > 0 && savedHistoryIndex !== undefined) {
             initialPages = savedHistory[savedHistoryIndex].pages;
          } else {
             initialPages = Array.from({ length: pdfJsDoc.numPages }).map((_, i) => ({
              id: `page-${i}-${Date.now()}`,
              originalIndex: i,
              rotation: 0,
            }));
          }

          setPdfDocs(pdfLibDoc, pdfJsDoc);
          setPages(initialPages);
          setIsLoading(false);
          resetTools();

          if (savedHistory && savedHistoryIndex !== undefined) {
            loadHistory(savedHistory, savedHistoryIndex);
          }
        }
      } catch (error) {
        logError('Failed to load from IndexedDB', error);
        setIsLoading(false);
      }
    };
    loadFromDB();
  }, [setDocument, setPdfDocs, setPages, setIsLoading, resetTools, loadHistory]);

  return <>{children}</>;
}

// Re-export granular store hooks for convenience
export { useDocumentStore, useToolsStore, useAnnotationsStore };

// Combined hook for backwards compatibility (migrating components should use granular hooks)
/**
 * @deprecated Use granular store hooks (`useDocumentStore`, `useToolsStore`,
 * `useAnnotationsStore`) directly. `useEditor()` subscribes to every store and
 * causes unnecessary re-renders. Will be removed in a future release.
 */
export function useEditor() {
  const document = useDocumentStore();
  const tools = useToolsStore();
  const annotations = useAnnotationsStore();

  return {
    // Document state
    file: document.file,
    pdfLibDoc: document.pdfLibDoc,
    pdfJsDoc: document.pdfJsDoc,
    pages: document.pages,
    isLoading: document.isLoading,

    // Tools state
    currentPage: tools.currentPage,
    zoom: tools.zoom,
    activeTool: tools.activeTool,
    darkMode: tools.darkMode,

    // Annotations state
    annotations: annotations.annotations,
    selectedAnnotationId: annotations.selectedAnnotationId,
    history: annotations.history,
    historyIndex: annotations.historyIndex,

    // Computed
    canUndo: annotations.canUndo(),
    canRedo: annotations.canRedo(),

    // Document actions
    loadFile: document.loadFile,
    clearFile: document.clearFile,
    movePage: document.movePage,
    deletePage: (index: number) => {
      const newPage = document.deletePage(index, tools.currentPage);
      tools.setCurrentPage(newPage);
    },
    rotatePage: document.rotatePage,

    // Tools actions
    setCurrentPage: tools.setCurrentPage,
    setZoom: tools.setZoom,
    setActiveTool: tools.setActiveTool,
    toggleDarkMode: tools.toggleDarkMode,

    // Annotations actions
    setSelectedAnnotationId: annotations.setSelectedAnnotationId,
    addAnnotation: (annotation: Annotation) => annotations.addAnnotation(annotation, document.pages),
    updateAnnotation: (id: string, updates: Partial<Annotation>) => annotations.updateAnnotation(id, updates, document.pages),
    deleteAnnotation: (id: string) => annotations.deleteAnnotation(id, document.pages),
    undo: () => {
      const result = annotations.undo(document.pages);
      if (result) {
        document.setPages(result.pages);
      }
    },
    redo: () => {
      const result = annotations.redo(document.pages);
      if (result) {
        document.setPages(result.pages);
      }
    },
    pushHistory: annotations.pushHistory,
  };
}
