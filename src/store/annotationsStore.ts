import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import { PageMeta, Annotation } from '../contexts/EditorContext';

interface HistoryState {
  pages: PageMeta[];
  annotations: Annotation[];
}

interface AnnotationsState {
  // Annotations State
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  history: HistoryState[];
  historyIndex: number;

  // Actions
  setAnnotations: (annotations: Annotation[]) => void;
  setSelectedAnnotationId: (id: string | null) => void;

  // History Actions
  pushHistory: (pages: PageMeta[], annotations: Annotation[]) => void;
  undo: (pages: PageMeta[]) => { pages: PageMeta[]; annotations: Annotation[] } | null;
  redo: (pages: PageMeta[]) => { pages: PageMeta[]; annotations: Annotation[] } | null;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Complex Actions
  addAnnotation: (annotation: Annotation, pages: PageMeta[]) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>, pages: PageMeta[]) => void;
  deleteAnnotation: (id: string, pages: PageMeta[]) => void;
  loadHistory: (savedHistory: HistoryState[], savedHistoryIndex: number) => void;
  clearHistory: () => void;
}

export const useAnnotationsStore = create<AnnotationsState>((setStore, getStore) => ({
  annotations: [],
  selectedAnnotationId: null,
  history: [],
  historyIndex: -1,

  setAnnotations: (annotations) => setStore({ annotations }),
  setSelectedAnnotationId: (selectedAnnotationId) => setStore({ selectedAnnotationId }),

  pushHistory: (pages, annotations) => {
    setStore((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ pages: [...pages], annotations: [...annotations] });
      // Keep last 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      const newIndex = newHistory.length - 1;

      // Save to IndexedDB
      set('editor-history', newHistory);
      set('editor-history-index', newIndex);

      return {
        history: newHistory,
        historyIndex: newIndex,
        annotations: [...annotations],
      };
    });
  },

  undo: (pages) => {
    const { history, historyIndex } = getStore();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];

      set('editor-history-index', newIndex);

      setStore({
        historyIndex: newIndex,
        annotations: [...previousState.annotations],
        selectedAnnotationId: null,
      });

      return { pages: previousState.pages, annotations: previousState.annotations };
    }
    return null;
  },

  redo: (pages) => {
    const { history, historyIndex } = getStore();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];

      set('editor-history-index', newIndex);

      setStore({
        historyIndex: newIndex,
        annotations: [...nextState.annotations],
        selectedAnnotationId: null,
      });

      return { pages: nextState.pages, annotations: nextState.annotations };
    }
    return null;
  },

  canUndo: () => {
    const { historyIndex } = getStore();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = getStore();
    return historyIndex < history.length - 1;
  },

  addAnnotation: (annotation, pages) => {
    const { annotations, pushHistory } = getStore();
    const newAnnotations = [...annotations, annotation];
    pushHistory(pages, newAnnotations);
    setStore({
      annotations: newAnnotations,
      selectedAnnotationId: annotation.id,
    });
  },

  updateAnnotation: (id, updates, pages) => {
    setStore((state) => {
      const nextAnnotations = state.annotations.map(ann =>
        ann.id === id ? { ...ann, ...updates } as Annotation : ann
      );
      getStore().pushHistory(pages, nextAnnotations);
      return { annotations: nextAnnotations };
    });
  },

  deleteAnnotation: (id, pages) => {
    setStore((state) => {
      const nextAnnotations = state.annotations.filter(ann => ann.id !== id);
      getStore().pushHistory(pages, nextAnnotations);
      return {
        annotations: nextAnnotations,
        selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
      };
    });
  },

  loadHistory: (savedHistory, savedHistoryIndex) => {
    setStore({
      history: savedHistory,
      historyIndex: savedHistoryIndex,
      annotations: savedHistory[savedHistoryIndex]?.annotations || [],
    });
  },

  clearHistory: () => {
    setStore({
      annotations: [],
      selectedAnnotationId: null,
      history: [],
      historyIndex: -1,
    });
  },
}));
