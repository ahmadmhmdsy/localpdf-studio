import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all Tauri plugins BEFORE importing the module under test.
const mockOpen = vi.fn();
const mockSave = vi.fn();
const mockWriteFile = vi.fn();
const mockWriteTextFile = vi.fn();
const mockReadFile = vi.fn();
const mockStoreGet = vi.fn();
const mockStoreSet = vi.fn();
const mockStoreDelete = vi.fn();
const mockStoreSave = vi.fn();

const mockStoreInstance = {
  get: mockStoreGet,
  set: mockStoreSet,
  delete: mockStoreDelete,
  save: mockStoreSave,
};

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: (...args: unknown[]) => mockOpen(...args),
  save: (...args: unknown[]) => mockSave(...args),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  readTextFile: vi.fn(),
  BaseDirectory: { AppConfig: 1, AppData: 2 },
}));

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: {
    load: vi.fn().mockResolvedValue(mockStoreInstance),
  },
}));

import {
  API_KEY_CHANGED_EVENT,
  deleteStoreValue,
  emitApiKeyChanged,
  getStoreValue,
  isTauri,
  pickFiles,
  saveFile,
  setStoreValue,
} from './native';

describe('isTauri', () => {
  const originalInternals = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

  afterEach(() => {
    if (originalInternals === undefined) {
      delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    } else {
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = originalInternals;
    }
  });

  it('returns false when __TAURI_INTERNALS__ is not set', () => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    expect(isTauri()).toBe(false);
  });

  it('returns true when __TAURI_INTERNALS__ is set', () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    expect(isTauri()).toBe(true);
  });
});

describe('pickFiles', () => {
  beforeEach(() => {
    mockOpen.mockReset();
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('throws when not in Tauri', async () => {
    await expect(pickFiles()).rejects.toThrow(/requires Tauri runtime/);
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('returns array of paths from the dialog plugin', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockOpen.mockResolvedValueOnce(['C:/tmp/a.pdf', 'C:/tmp/b.pdf']);
    const result = await pickFiles({ extensions: ['pdf'], multiple: true });
    expect(result).toEqual(['C:/tmp/a.pdf', 'C:/tmp/b.pdf']);
    expect(mockOpen).toHaveBeenCalledWith(expect.objectContaining({
      multiple: true,
      directory: false,
      filters: [{ name: 'Files', extensions: ['pdf'] }],
    }));
  });

  it('returns [] when user cancels (null result)', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockOpen.mockResolvedValueOnce(null);
    expect(await pickFiles()).toEqual([]);
  });

  it('wraps a single string result in an array', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockOpen.mockResolvedValueOnce('C:/one.pdf');
    expect(await pickFiles()).toEqual(['C:/one.pdf']);
  });
});

describe('saveFile', () => {
  beforeEach(() => {
    mockSave.mockReset();
    mockWriteFile.mockReset();
    mockWriteTextFile.mockReset();
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('throws when not in Tauri', async () => {
    await expect(saveFile({ defaultName: 'a.pdf', data: new Uint8Array() })).rejects.toThrow();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('returns null when user cancels', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockSave.mockResolvedValueOnce(null);
    expect(await saveFile({ defaultName: 'a.pdf', data: new Uint8Array([1,2,3]) })).toBeNull();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('writes bytes and returns the chosen path', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockSave.mockResolvedValueOnce('C:/out/a.pdf');
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const result = await saveFile({ defaultName: 'a.pdf', extensions: ['pdf'], data: bytes });
    expect(result).toBe('C:/out/a.pdf');
    expect(mockWriteFile).toHaveBeenCalledWith('C:/out/a.pdf', bytes);
    expect(mockWriteTextFile).not.toHaveBeenCalled();
  });

  it('writes text via writeTextFile when data is a string', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockSave.mockResolvedValueOnce('C:/out/note.txt');
    const result = await saveFile({ defaultName: 'note.txt', data: 'hello' });
    expect(result).toBe('C:/out/note.txt');
    expect(mockWriteTextFile).toHaveBeenCalledWith('C:/out/note.txt', 'hello');
  });
});

describe('store helpers', () => {
  beforeEach(() => {
    mockStoreGet.mockReset();
    mockStoreSet.mockReset();
    mockStoreDelete.mockReset();
    mockStoreSave.mockReset();
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('getStoreValue returns null when not in Tauri', async () => {
    expect(await getStoreValue('k')).toBeNull();
    expect(mockStoreGet).not.toHaveBeenCalled();
  });

  it('setStoreValue no-ops when not in Tauri', async () => {
    await expect(setStoreValue('k', 'v')).resolves.toBeUndefined();
    expect(mockStoreSet).not.toHaveBeenCalled();
  });

  it('deleteStoreValue no-ops when not in Tauri', async () => {
    await expect(deleteStoreValue('k')).resolves.toBeUndefined();
    expect(mockStoreDelete).not.toHaveBeenCalled();
  });

  it('getStoreValue returns null when key missing', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockStoreGet.mockResolvedValueOnce(undefined);
    expect(await getStoreValue('missing')).toBeNull();
  });

  it('getStoreValue returns the stored value', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockStoreGet.mockResolvedValueOnce('hello');
    expect(await getStoreValue('greeting')).toBe('hello');
  });

  it('setStoreValue writes and saves', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockStoreSet.mockResolvedValueOnce(undefined);
    mockStoreSave.mockResolvedValueOnce(undefined);
    await setStoreValue('geminiApiKey', 'AIza...');
    expect(mockStoreSet).toHaveBeenCalledWith('geminiApiKey', 'AIza...');
    expect(mockStoreSave).toHaveBeenCalledTimes(1);
  });

  it('deleteStoreValue deletes and saves', async () => {
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    mockStoreDelete.mockResolvedValueOnce(true);
    mockStoreSave.mockResolvedValueOnce(undefined);
    await deleteStoreValue('geminiApiKey');
    expect(mockStoreDelete).toHaveBeenCalledWith('geminiApiKey');
    expect(mockStoreSave).toHaveBeenCalledTimes(1);
  });
});

describe('emitApiKeyChanged', () => {
  it('dispatches a CustomEvent with the expected name', () => {
    const handler = vi.fn();
    window.addEventListener(API_KEY_CHANGED_EVENT, handler);
    emitApiKeyChanged();
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(API_KEY_CHANGED_EVENT, handler);
  });
});
