import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAnnotationsStore } from './annotationsStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
}));

describe('annotationsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAnnotationsStore.setState({
      annotations: [],
      selectedAnnotationId: null,
      history: [],
      historyIndex: -1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setAnnotations', () => {
    it('sets annotations array', () => {
      const annotations = [
        { id: 'ann-1', pageId: 'page-0', type: 'text' as const, text: 'Hello', x: 0.5, y: 0.5, fontSize: 12, color: '#000' },
      ];
      useAnnotationsStore.getState().setAnnotations(annotations);
      expect(useAnnotationsStore.getState().annotations).toEqual(annotations);
    });
  });

  describe('setSelectedAnnotationId', () => {
    it('sets selected annotation ID', () => {
      useAnnotationsStore.getState().setSelectedAnnotationId('ann-1');
      expect(useAnnotationsStore.getState().selectedAnnotationId).toBe('ann-1');
    });

    it('clears selected annotation ID', () => {
      useAnnotationsStore.getState().setSelectedAnnotationId('ann-1');
      useAnnotationsStore.getState().setSelectedAnnotationId(null);
      expect(useAnnotationsStore.getState().selectedAnnotationId).toBeNull();
    });
  });

  const testPages = [{ id: 'page-0', originalIndex: 0, rotation: 0 }];

  describe('addAnnotation', () => {
    it('adds a text annotation', () => {
      const annotation = {
        id: 'ann-1',
        pageId: 'page-0',
        type: 'text' as const,
        text: 'Hello',
        x: 0.5,
        y: 0.5,
        fontSize: 12,
        color: '#000',
      };
      useAnnotationsStore.getState().addAnnotation(annotation, testPages);
      expect(useAnnotationsStore.getState().annotations).toHaveLength(1);
      expect(useAnnotationsStore.getState().annotations[0]).toEqual(annotation);
      expect(useAnnotationsStore.getState().selectedAnnotationId).toBe('ann-1');
    });

    it('adds a draw annotation', () => {
      const annotation = {
        id: 'ann-2',
        pageId: 'page-0',
        type: 'draw' as const,
        points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        color: '#ff0000',
        strokeWidth: 2,
      };
      useAnnotationsStore.getState().addAnnotation(annotation, testPages);
      expect(useAnnotationsStore.getState().annotations).toHaveLength(1);
    });

    it('adds multiple annotations', () => {
      useAnnotationsStore.getState().addAnnotation({
        id: 'ann-1', pageId: 'page-0', type: 'text' as const, text: 'A', x: 0, y: 0, fontSize: 12, color: '#000',
      }, testPages);
      useAnnotationsStore.getState().addAnnotation({
        id: 'ann-2', pageId: 'page-0', type: 'text' as const, text: 'B', x: 0, y: 0, fontSize: 12, color: '#000',
      }, testPages);
      expect(useAnnotationsStore.getState().annotations).toHaveLength(2);
    });

    it('pushes history so the addition is undoable', () => {
      useAnnotationsStore.getState().addAnnotation({
        id: 'ann-1', pageId: 'page-0', type: 'text' as const, text: 'A', x: 0, y: 0, fontSize: 12, color: '#000',
      }, testPages);
      expect(useAnnotationsStore.getState().history.length).toBeGreaterThan(0);
    });
  });

  describe('updateAnnotation', () => {
    beforeEach(() => {
      useAnnotationsStore.getState().addAnnotation({
        id: 'ann-1', pageId: 'page-0', type: 'text' as const, text: 'Hello', x: 0.5, y: 0.5, fontSize: 12, color: '#000',
      }, testPages);
    });

    it('updates annotation text', () => {
      useAnnotationsStore.getState().updateAnnotation('ann-1', { text: 'Updated' }, testPages);
      const ann = useAnnotationsStore.getState().annotations[0];
      expect(ann.type === 'text' ? ann.text : '').toBe('Updated');
    });

    it('updates annotation position', () => {
      useAnnotationsStore.getState().updateAnnotation('ann-1', { x: 0.8, y: 0.8 }, testPages);
      const ann = useAnnotationsStore.getState().annotations[0];
      expect(ann.type === 'text' ? ann.x : 0).toBe(0.8);
    });

    it('does not affect other annotations', () => {
      useAnnotationsStore.getState().addAnnotation({
        id: 'ann-2', pageId: 'page-0', type: 'text' as const, text: 'Other', x: 0, y: 0, fontSize: 12, color: '#000',
      }, testPages);
      useAnnotationsStore.getState().updateAnnotation('ann-1', { text: 'Updated' }, testPages);
      const ann2 = useAnnotationsStore.getState().annotations.find(a => a.id === 'ann-2');
      expect(ann2?.type === 'text' ? ann2.text : '').toBe('Other');
    });
  });

  describe('deleteAnnotation', () => {
    beforeEach(() => {
      useAnnotationsStore.getState().addAnnotation({
        id: 'ann-1', pageId: 'page-0', type: 'text' as const, text: 'A', x: 0, y: 0, fontSize: 12, color: '#000',
      }, testPages);
      useAnnotationsStore.getState().addAnnotation({
        id: 'ann-2', pageId: 'page-0', type: 'text' as const, text: 'B', x: 0, y: 0, fontSize: 12, color: '#000',
      }, testPages);
    });

    it('deletes annotation by ID', () => {
      useAnnotationsStore.getState().deleteAnnotation('ann-1', testPages);
      expect(useAnnotationsStore.getState().annotations).toHaveLength(1);
      expect(useAnnotationsStore.getState().annotations[0].id).toBe('ann-2');
    });

    it('clears selection if deleted annotation was selected', () => {
      useAnnotationsStore.getState().setSelectedAnnotationId('ann-1');
      useAnnotationsStore.getState().deleteAnnotation('ann-1', testPages);
      expect(useAnnotationsStore.getState().selectedAnnotationId).toBeNull();
    });

    it('keeps selection if different annotation was selected', () => {
      useAnnotationsStore.getState().setSelectedAnnotationId('ann-2');
      useAnnotationsStore.getState().deleteAnnotation('ann-1', testPages);
      expect(useAnnotationsStore.getState().selectedAnnotationId).toBe('ann-2');
    });
  });

  describe('pushHistory / undo / redo', () => {
    const pages = [
      { id: 'page-0', originalIndex: 0, rotation: 0 },
      { id: 'page-1', originalIndex: 1, rotation: 0 },
    ];
    const annotations = [
      { id: 'ann-1', pageId: 'page-0', type: 'text' as const, text: 'Hello', x: 0.5, y: 0.5, fontSize: 12, color: '#000' },
    ];

    it('pushes history state', () => {
      useAnnotationsStore.getState().pushHistory(pages, annotations);
      expect(useAnnotationsStore.getState().history).toHaveLength(1);
      expect(useAnnotationsStore.getState().historyIndex).toBe(0);
    });

    it('can undo after pushing history', () => {
      useAnnotationsStore.getState().pushHistory(pages, annotations);
      useAnnotationsStore.getState().pushHistory(pages, [...annotations, { id: 'ann-2', pageId: 'page-0', type: 'text' as const, text: 'World', x: 0, y: 0, fontSize: 12, color: '#000' }]);
      const result = useAnnotationsStore.getState().undo(pages);
      expect(result).not.toBeNull();
      expect(result?.annotations).toHaveLength(1);
    });

    it('can redo after undo', () => {
      useAnnotationsStore.getState().pushHistory(pages, annotations);
      useAnnotationsStore.getState().pushHistory(pages, [...annotations, { id: 'ann-2', pageId: 'page-0', type: 'text' as const, text: 'World', x: 0, y: 0, fontSize: 12, color: '#000' }]);
      useAnnotationsStore.getState().undo(pages);
      const result = useAnnotationsStore.getState().redo(pages);
      expect(result).not.toBeNull();
      expect(result?.annotations).toHaveLength(2);
    });

    it('cannot undo at start of history', () => {
      const result = useAnnotationsStore.getState().undo(pages);
      expect(result).toBeNull();
    });

    it('cannot redo at end of history', () => {
      useAnnotationsStore.getState().pushHistory(pages, annotations);
      const result = useAnnotationsStore.getState().redo(pages);
      expect(result).toBeNull();
    });

    it('canUndo returns correct value', () => {
      expect(useAnnotationsStore.getState().canUndo()).toBe(false);
      useAnnotationsStore.getState().pushHistory(pages, annotations);
      useAnnotationsStore.getState().pushHistory(pages, annotations);
      expect(useAnnotationsStore.getState().canUndo()).toBe(true);
    });

    it('canRedo returns correct value', () => {
      useAnnotationsStore.getState().pushHistory(pages, annotations);
      useAnnotationsStore.getState().pushHistory(pages, annotations);
      expect(useAnnotationsStore.getState().canRedo()).toBe(false);
      useAnnotationsStore.getState().undo(pages);
      expect(useAnnotationsStore.getState().canRedo()).toBe(true);
    });

    it('truncates future history when pushing new state after undo', () => {
      useAnnotationsStore.getState().pushHistory(pages, annotations);
      useAnnotationsStore.getState().pushHistory(pages, [...annotations, { id: 'ann-2', pageId: 'page-0', type: 'text' as const, text: 'World', x: 0, y: 0, fontSize: 12, color: '#000' }]);
      useAnnotationsStore.getState().undo(pages);
      useAnnotationsStore.getState().pushHistory(pages, [{ id: 'ann-3', pageId: 'page-0', type: 'text' as const, text: 'New', x: 0, y: 0, fontSize: 12, color: '#000' }]);
      expect(useAnnotationsStore.getState().history).toHaveLength(2);
      expect(useAnnotationsStore.getState().canRedo()).toBe(false);
    });

    it('limits history to 50 states', () => {
      for (let i = 0; i < 55; i++) {
        useAnnotationsStore.getState().pushHistory(pages, [{ id: `ann-${i}`, pageId: 'page-0', type: 'text' as const, text: `Text ${i}`, x: 0, y: 0, fontSize: 12, color: '#000' }]);
      }
      expect(useAnnotationsStore.getState().history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('loadHistory', () => {
    it('loads saved history', () => {
      const history = [
        { pages: [{ id: 'page-0', originalIndex: 0, rotation: 0 }], annotations: [{ id: 'ann-1', pageId: 'page-0', type: 'text' as const, text: 'Hello', x: 0, y: 0, fontSize: 12, color: '#000' }] },
      ];
      useAnnotationsStore.getState().loadHistory(history, 0);
      expect(useAnnotationsStore.getState().history).toEqual(history);
      expect(useAnnotationsStore.getState().historyIndex).toBe(0);
    });
  });

  describe('clearHistory', () => {
    beforeEach(() => {
      useAnnotationsStore.getState().pushHistory(
        [{ id: 'page-0', originalIndex: 0, rotation: 0 }],
        [{ id: 'ann-1', pageId: 'page-0', type: 'text' as const, text: 'Hello', x: 0, y: 0, fontSize: 12, color: '#000' }],
      );
    });

    it('clears all history and annotations', () => {
      useAnnotationsStore.getState().clearHistory();
      expect(useAnnotationsStore.getState().history).toEqual([]);
      expect(useAnnotationsStore.getState().historyIndex).toBe(-1);
      expect(useAnnotationsStore.getState().annotations).toEqual([]);
      expect(useAnnotationsStore.getState().selectedAnnotationId).toBeNull();
    });
  });
});
