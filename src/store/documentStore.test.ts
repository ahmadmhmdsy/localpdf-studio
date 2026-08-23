import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDocumentStore } from './documentStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn().mockResolvedValue({ getPageCount: () => 3 }),
  },
}));

vi.mock('../lib/pdfjs', () => ({
  pdfjsLib: {
    getDocument: vi.fn(() => ({
      promise: Promise.resolve({ numPages: 3 }),
    })),
    GlobalWorkerOptions: { workerSrc: '' },
  },
}));

describe('documentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = useDocumentStore.getState();
    useDocumentStore.setState({
      file: null,
      pdfLibDoc: null,
      pdfJsDoc: null,
      pages: [],
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setFile', () => {
    it('sets the file', () => {
      const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
      useDocumentStore.getState().setFile(file);
      expect(useDocumentStore.getState().file).toBe(file);
    });

    it('clears the file when set to null', () => {
      const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
      useDocumentStore.getState().setFile(file);
      useDocumentStore.getState().setFile(null);
      expect(useDocumentStore.getState().file).toBeNull();
    });
  });

  describe('setPages', () => {
    it('sets pages array', () => {
      const pages = [
        { id: 'page-0', originalIndex: 0, rotation: 0 },
        { id: 'page-1', originalIndex: 1, rotation: 0 },
      ];
      useDocumentStore.getState().setPages(pages);
      expect(useDocumentStore.getState().pages).toEqual(pages);
    });
  });

  describe('setIsLoading', () => {
    it('sets loading state', () => {
      useDocumentStore.getState().setIsLoading(true);
      expect(useDocumentStore.getState().isLoading).toBe(true);
      useDocumentStore.getState().setIsLoading(false);
      expect(useDocumentStore.getState().isLoading).toBe(false);
    });
  });

  describe('movePage', () => {
    beforeEach(() => {
      useDocumentStore.getState().setPages([
        { id: 'page-0', originalIndex: 0, rotation: 0 },
        { id: 'page-1', originalIndex: 1, rotation: 0 },
        { id: 'page-2', originalIndex: 2, rotation: 0 },
      ]);
    });

    it('moves page from index 0 to index 2', () => {
      useDocumentStore.getState().movePage(0, 2);
      const pages = useDocumentStore.getState().pages;
      expect(pages[0].originalIndex).toBe(1);
      expect(pages[1].originalIndex).toBe(2);
      expect(pages[2].originalIndex).toBe(0);
    });

    it('moves page from index 2 to index 0', () => {
      useDocumentStore.getState().movePage(2, 0);
      const pages = useDocumentStore.getState().pages;
      expect(pages[0].originalIndex).toBe(2);
      expect(pages[1].originalIndex).toBe(0);
      expect(pages[2].originalIndex).toBe(1);
    });
  });

  describe('deletePage', () => {
    beforeEach(() => {
      useDocumentStore.getState().setPages([
        { id: 'page-0', originalIndex: 0, rotation: 0 },
        { id: 'page-1', originalIndex: 1, rotation: 0 },
        { id: 'page-2', originalIndex: 2, rotation: 0 },
      ]);
    });

    it('deletes page at index 1', () => {
      const newCurrent = useDocumentStore.getState().deletePage(1, 2);
      const pages = useDocumentStore.getState().pages;
      expect(pages.length).toBe(2);
      expect(pages[0].originalIndex).toBe(0);
      expect(pages[1].originalIndex).toBe(2);
    });

    it('adjusts current page if it was beyond deleted page', () => {
      const newCurrent = useDocumentStore.getState().deletePage(0, 3);
      expect(newCurrent).toBe(2);
    });
  });

  describe('rotatePage', () => {
    beforeEach(() => {
      useDocumentStore.getState().setPages([
        { id: 'page-0', originalIndex: 0, rotation: 0 },
        { id: 'page-1', originalIndex: 1, rotation: 0 },
      ]);
    });

    it('rotates page by 90 degrees', () => {
      useDocumentStore.getState().rotatePage(0, 90);
      expect(useDocumentStore.getState().pages[0].rotation).toBe(90);
    });

    it('rotates page by 180 degrees', () => {
      useDocumentStore.getState().rotatePage(1, 180);
      expect(useDocumentStore.getState().pages[1].rotation).toBe(180);
    });

    it('wraps rotation at 360', () => {
      useDocumentStore.getState().rotatePage(0, 400);
      expect(useDocumentStore.getState().pages[0].rotation).toBe(40);
    });
  });

  describe('setPdfDocs', () => {
    it('sets pdfLibDoc and pdfJsDoc together', () => {
      const pdfLibDoc = { getPageCount: () => 3 } as any;
      const pdfJsDoc = { numPages: 3 } as any;
      useDocumentStore.getState().setPdfDocs(pdfLibDoc, pdfJsDoc);
      expect(useDocumentStore.getState().pdfLibDoc).toBe(pdfLibDoc);
      expect(useDocumentStore.getState().pdfJsDoc).toBe(pdfJsDoc);
    });

    it('clears both docs when set to null', () => {
      useDocumentStore.getState().setPdfDocs({} as any, {} as any);
      useDocumentStore.getState().setPdfDocs(null, null);
      expect(useDocumentStore.getState().pdfLibDoc).toBeNull();
      expect(useDocumentStore.getState().pdfJsDoc).toBeNull();
    });
  });

  describe('loadFile', () => {
    it('loads file and sets up pages from PDF.js numPages', async () => {
      const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
      await useDocumentStore.getState().loadFile(file);
      const state = useDocumentStore.getState();
      expect(state.file).toBe(file);
      expect(state.isLoading).toBe(false);
      expect(state.pages.length).toBe(3);
      expect(state.pdfLibDoc).toBeTruthy();
      expect(state.pdfJsDoc).toBeTruthy();
    });

    it('persists file buffer to IndexedDB', async () => {
      const { set } = await import('idb-keyval');
      const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
      await useDocumentStore.getState().loadFile(file);
      expect(vi.mocked(set)).toHaveBeenCalledWith('editor-file-buffer', expect.any(ArrayBuffer));
      expect(vi.mocked(set)).toHaveBeenCalledWith('editor-file-name', 'test.pdf');
    });

    it('resets loading state and re-throws on PDF load error', async () => {
      const { PDFDocument } = await import('pdf-lib');
      vi.mocked(PDFDocument.load).mockRejectedValueOnce(new Error('Bad PDF'));
      const file = new File(['bad'], 'bad.pdf', { type: 'application/pdf' });
      await expect(useDocumentStore.getState().loadFile(file)).rejects.toThrow('Bad PDF');
      expect(useDocumentStore.getState().isLoading).toBe(false);
      expect(useDocumentStore.getState().file).toBeNull();
    });
  });

  describe('clearFile', () => {
    beforeEach(async () => {
      const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
      await useDocumentStore.getState().loadFile(file);
    });

    it('clears file and docs', async () => {
      await useDocumentStore.getState().clearFile();
      const state = useDocumentStore.getState();
      expect(state.file).toBeNull();
      expect(state.pdfLibDoc).toBeNull();
      expect(state.pdfJsDoc).toBeNull();
      expect(state.pages).toEqual([]);
    });

    it('clears IndexedDB keys', async () => {
      const { set } = await import('idb-keyval');
      await useDocumentStore.getState().clearFile();
      expect(vi.mocked(set)).toHaveBeenCalledWith('editor-file-buffer', undefined);
      expect(vi.mocked(set)).toHaveBeenCalledWith('editor-file-name', undefined);
    });
  });
});
