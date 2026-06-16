import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToolsStore } from './toolsStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
}));

describe('toolsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToolsStore.setState({
      currentPage: 1,
      zoom: 1,
      activeTool: null,
      darkMode: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setCurrentPage', () => {
    it('sets current page', () => {
      useToolsStore.getState().setCurrentPage(5);
      expect(useToolsStore.getState().currentPage).toBe(5);
    });
  });

  describe('setZoom', () => {
    it('sets zoom level', () => {
      useToolsStore.getState().setZoom(1.5);
      expect(useToolsStore.getState().zoom).toBe(1.5);
    });

    it('handles zoom out', () => {
      useToolsStore.getState().setZoom(0.5);
      expect(useToolsStore.getState().zoom).toBe(0.5);
    });
  });

  describe('setActiveTool', () => {
    it('sets active tool', () => {
      useToolsStore.getState().setActiveTool('text');
      expect(useToolsStore.getState().activeTool).toBe('text');
    });

    it('clears active tool', () => {
      useToolsStore.getState().setActiveTool('text');
      useToolsStore.getState().setActiveTool(null);
      expect(useToolsStore.getState().activeTool).toBeNull();
    });

    it('sets various tools', () => {
      const tools = ['select', 'pan', 'text', 'draw', 'image', 'redact', 'crop', 'signature'];
      tools.forEach(tool => {
        useToolsStore.getState().setActiveTool(tool);
        expect(useToolsStore.getState().activeTool).toBe(tool);
      });
    });
  });

  describe('setDarkMode', () => {
    it('sets dark mode on', () => {
      useToolsStore.getState().setDarkMode(true);
      expect(useToolsStore.getState().darkMode).toBe(true);
    });

    it('sets dark mode off', () => {
      useToolsStore.getState().setDarkMode(true);
      useToolsStore.getState().setDarkMode(false);
      expect(useToolsStore.getState().darkMode).toBe(false);
    });
  });

  describe('toggleDarkMode', () => {
    it('toggles from off to on', () => {
      useToolsStore.getState().toggleDarkMode();
      expect(useToolsStore.getState().darkMode).toBe(true);
    });

    it('toggles from on to off', () => {
      useToolsStore.getState().setDarkMode(true);
      useToolsStore.getState().toggleDarkMode();
      expect(useToolsStore.getState().darkMode).toBe(false);
    });
  });

  describe('resetTools', () => {
    beforeEach(() => {
      useToolsStore.getState().setCurrentPage(5);
      useToolsStore.getState().setZoom(2);
      useToolsStore.getState().setActiveTool('text');
    });

    it('resets currentPage to 1', () => {
      useToolsStore.getState().resetTools();
      expect(useToolsStore.getState().currentPage).toBe(1);
    });

    it('resets zoom to 1', () => {
      useToolsStore.getState().resetTools();
      expect(useToolsStore.getState().zoom).toBe(1);
    });

    it('resets activeTool to null', () => {
      useToolsStore.getState().resetTools();
      expect(useToolsStore.getState().activeTool).toBeNull();
    });
  });
});
