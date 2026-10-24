import { create } from 'zustand';
import { PDFDocument } from 'pdf-lib';
import { pdfjsLib } from '../lib/pdfjs';
import { set } from 'idb-keyval';
import { PageMeta } from '../contexts/EditorContext';
import { logError } from '../lib/logger';

interface DocumentState {
  // Document State
  file: File | null;
  pdfLibDoc: PDFDocument | null;
  pdfJsDoc: pdfjsLib.PDFDocumentProxy | null;
  pages: PageMeta[];
  isLoading: boolean;

  // Actions
  setFile: (file: File | null) => void;
  setPdfDocs: (pdfLibDoc: PDFDocument | null, pdfJsDoc: pdfjsLib.PDFDocumentProxy | null) => void;
  setPages: (pages: PageMeta[]) => void;
  setIsLoading: (isLoading: boolean) => void;

  // Complex Actions
  loadFile: (file: File) => Promise<void>;
  clearFile: () => Promise<void>;
  movePage: (oldIndex: number, newIndex: number) => void;
  deletePage: (index: number, currentPage: number) => number;
  rotatePage: (index: number, delta: number) => void;
}

export const useDocumentStore = create<DocumentState>((setStore) => ({
  file: null,
  pdfLibDoc: null,
  pdfJsDoc: null,
  pages: [],
  isLoading: false,

  setFile: (file) => setStore({ file }),
  setPdfDocs: (pdfLibDoc, pdfJsDoc) => setStore({ pdfLibDoc, pdfJsDoc }),
  setPages: (pages) => setStore({ pages }),
  setIsLoading: (isLoading) => setStore({ isLoading }),

  loadFile: async (file: File) => {
    setStore({ isLoading: true, file });
    try {
      const arrayBuffer = await file.arrayBuffer();

      await set('editor-file-buffer', arrayBuffer);
      await set('editor-file-name', file.name);
      await set('editor-file-type', file.type);

      const pdfLibDoc = await PDFDocument.load(arrayBuffer);
      const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const initialPages: PageMeta[] = Array.from({ length: pdfJsDoc.numPages }).map((_, i) => ({
        id: `page-${i}-${Date.now()}`,
        originalIndex: i,
        rotation: 0,
      }));

      setStore({
        pdfLibDoc,
        pdfJsDoc,
        pages: initialPages,
        isLoading: false,
      });
    } catch (error) {
      logError("Error loading PDF:", error);
      setStore({ isLoading: false, file: null });
      throw error;
    }
  },

  clearFile: async () => {
    await set('editor-file-buffer', undefined);
    await set('editor-file-name', undefined);
    await set('editor-file-type', undefined);

    setStore({
      file: null,
      pdfLibDoc: null,
      pdfJsDoc: null,
      pages: [],
      isLoading: false,
    });
  },

  movePage: (oldIndex: number, newIndex: number) => {
    setStore((state) => {
      const newPages = [...state.pages];
      const [movedItem] = newPages.splice(oldIndex, 1);
      newPages.splice(newIndex, 0, movedItem);
      return { pages: newPages };
    });
  },

  deletePage: (index: number, currentPage: number) => {
    let newCurrentPage = currentPage;
    setStore((state) => {
      const newPages = [...state.pages];
      newPages.splice(index, 1);
      if (currentPage > newPages.length) {
        newCurrentPage = newPages.length;
      }
      return { pages: newPages };
    });
    return newCurrentPage;
  },

  rotatePage: (index: number, delta: number) => {
    setStore((state) => {
      const newPages = [...state.pages];
      newPages[index] = {
        ...newPages[index],
        rotation: (newPages[index].rotation + delta) % 360,
      };
      return { pages: newPages };
    });
  },
}));
