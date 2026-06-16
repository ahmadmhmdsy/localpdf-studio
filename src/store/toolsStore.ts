import { create } from 'zustand';
import { get, set } from 'idb-keyval';

interface ToolsState {
  // Tool/UI State
  currentPage: number;
  zoom: number;
  activeTool: string | null;
  darkMode: boolean;
  propertiesPanelVisible: boolean;

  // Actions
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setActiveTool: (tool: string | null) => void;
  setDarkMode: (darkMode: boolean) => void;
  toggleDarkMode: () => void;
  togglePropertiesPanel: () => void;
  resetTools: () => void;
}

export const useToolsStore = create<ToolsState>((setStore) => ({
  currentPage: 1,
  zoom: 1,
  activeTool: null,
  darkMode: false,
  propertiesPanelVisible: true,

  setCurrentPage: (currentPage) => setStore({ currentPage }),
  setZoom: (zoom) => setStore({ zoom }),
  setActiveTool: (activeTool) => setStore({ activeTool }),
  setDarkMode: (darkMode) => setStore({ darkMode }),

  toggleDarkMode: () => {
    setStore((state) => {
      const newDarkMode = !state.darkMode;
      return { darkMode: newDarkMode };
    });
  },

  togglePropertiesPanel: () => {
    setStore((state) => ({ propertiesPanelVisible: !state.propertiesPanelVisible }));
  },

  resetTools: () => {
    setStore({
      currentPage: 1,
      zoom: 1,
      activeTool: null,
    });
  },
}));
