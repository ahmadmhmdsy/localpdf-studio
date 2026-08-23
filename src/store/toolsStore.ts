import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import type { SkinId } from '../theme';

/**
 * Persisted UI preferences (skin + darkMode) live in IndexedDB so they survive
 * page reloads without depending on `localStorage` (which can be unavailable
 * in some browser contexts).
 */
const PREF_KEY = 'ui-preferences';
type PersistedPrefs = {
  darkMode?: boolean;
  skin?: 'glass' | 'bento';
};

async function loadPrefs(): Promise<PersistedPrefs> {
  try {
    const v = (await get<PersistedPrefs>(PREF_KEY)) ?? {};
    return v;
  } catch {
    return {};
  }
}

async function savePrefs(prefs: PersistedPrefs): Promise<void> {
  try {
    await set(PREF_KEY, prefs);
  } catch {
    /* ignore — persistence is best-effort */
  }
}

// Kick off an initial load so the store hydrates with persisted values.
// We can't await at module init in zustand without a wrapping hook, so we
// expose the resolved initial values via an async `hydrate()` method below.
const initialPrefs: PersistedPrefs = {};

interface ToolsState {
  // Tool/UI State
  currentPage: number;
  zoom: number;
  activeTool: string | null;
  darkMode: boolean;
  /** 'glass' = current floating-pill chrome with dark glassmorphism.
   *  'bento' = sidebar-nav + bento grid layout. */
  skin: SkinId;
  /** True until persisted preferences finish loading from IndexedDB.
   *  Prevents a flash of the wrong theme/skin on first paint. */
  hydrated: boolean;
  propertiesPanelVisible: boolean;

  // Actions
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setActiveTool: (tool: string | null) => void;
  setDarkMode: (darkMode: boolean) => void;
  toggleDarkMode: () => void;
  setSkin: (skin: SkinId) => void;
  /** Read persisted prefs from IndexedDB and apply them. Call once at app boot. */
  hydrate: () => Promise<void>;
  togglePropertiesPanel: () => void;
  resetTools: () => void;
}

export const useToolsStore = create<ToolsState>((setStore, getStore) => ({
  currentPage: 1,
  zoom: 1,
  activeTool: null,
  darkMode: initialPrefs.darkMode ?? false,
  skin: initialPrefs.skin ?? 'glass',
  hydrated: false,
  propertiesPanelVisible: true,

  setCurrentPage: (currentPage) => setStore({ currentPage }),
  setZoom: (zoom) => setStore({ zoom }),
  setActiveTool: (activeTool) => setStore({ activeTool }),
  setDarkMode: (darkMode) => {
    setStore({ darkMode });
    const cur = getStore();
    void savePrefs({ darkMode, skin: cur.skin });
  },

  toggleDarkMode: () => {
    setStore((state) => {
      const newDarkMode = !state.darkMode;
      void savePrefs({ darkMode: newDarkMode, skin: state.skin });
      return { darkMode: newDarkMode };
    });
  },

  setSkin: (skin) => {
    setStore({ skin });
    const cur = getStore();
    void savePrefs({ darkMode: cur.darkMode, skin });
  },

  hydrate: async () => {
    const prefs = await loadPrefs();
    setStore({
      darkMode: prefs.darkMode ?? false,
      skin: prefs.skin ?? 'glass',
      hydrated: true,
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
