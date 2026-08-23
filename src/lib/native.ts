/**
 * Native bridge: abstracts over Tauri 2 desktop APIs.
 *
 * In a browser context every function here falls back to web behavior:
 *   - isTauri()            -> false
 *   - pickFiles()          -> throws (use <input type="file"> instead)
 *   - saveFile()           -> throws (use blob URL download instead)
 *   - getStore()/setStore()-> throws (use localStorage / IndexedDB instead)
 *
 * In a Tauri 2 context the corresponding plugin is invoked and returns a
 * promise that resolves with the native result (path, picked files, etc.).
 *
 * Why this abstraction:
 *   - Single import surface for components.
 *   - Plugin imports are lazy (loaded only when isTauri() is true and a
 *     function is actually called). This keeps the browser bundle slim and
 *     lets jsdom-based tests import this module without pulling in Tauri
 *     plugin code.
 *   - Future Capacitor adapter can sit alongside without changing components.
 */

/** True when running inside a Tauri 2 webview. */
export function isTauri(): boolean {
  return typeof window !== 'undefined'
    && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export interface PickFilesOptions {
  /** e.g. ['pdf'] for *.pdf, ['png','jpg'] for images. */
  extensions?: string[];
  multiple?: boolean;
  /** Dialog title shown on macOS / Linux / Windows. */
  title?: string;
  /** Optional starting directory absolute path. */
  defaultPath?: string;
}

/**
 * Open a native file picker.
 * Browsers: throws. Use a regular <input type="file"> element.
 * Tauri:    returns absolute file paths selected by the user.
 */
export async function pickFiles(opts: PickFilesOptions = {}): Promise<string[]> {
  if (!isTauri()) {
    throw new Error('pickFiles() requires Tauri runtime. Use <input type="file"> in the browser.');
  }
  const { open } = await import('@tauri-apps/plugin-dialog');
  const filters = opts.extensions?.length
    ? [{ name: 'Files', extensions: opts.extensions }]
    : undefined;
  const selected = await open({
    multiple: opts.multiple ?? false,
    directory: false,
    filters,
    title: opts.title,
    defaultPath: opts.defaultPath,
  });
  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}

export interface SaveFileOptions {
  /** Suggested filename shown in the dialog. */
  defaultName: string;
  /** e.g. ['pdf']. */
  extensions?: string[];
  title?: string;
  /** Bytes or string to write if the user confirms a destination. */
  data: Uint8Array | string;
}

/**
 * Open a native save dialog and write bytes to the chosen location.
 * Returns the absolute path written, or null if the user cancelled.
 */
export async function saveFile(opts: SaveFileOptions): Promise<string | null> {
  if (!isTauri()) {
    throw new Error('saveFile() requires Tauri runtime. Fall back to a blob download in the browser.');
  }
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile, writeTextFile } = await import('@tauri-apps/plugin-fs');
  const filters = opts.extensions?.length
    ? [{ name: 'Files', extensions: opts.extensions }]
    : undefined;
  const path = await save({
    defaultPath: opts.defaultName,
    filters,
    title: opts.title,
  });
  if (!path) return null;
  if (typeof opts.data === 'string') {
    await writeTextFile(path, opts.data);
  } else {
    await writeFile(path, opts.data);
  }
  return path;
}

/** Notice string returned by FileSystem Access-style operations. */
export interface FileHandle {
  /** Absolute path on disk. */
  path: string;
  /** Filename only (no directory). */
  name: string;
}

/**
 * Convenience wrapper: pickFiles then turn the paths into File objects
 * via Tauri's fs.readFile. Use this in components that want a uniform
 * File[] surface (so FileUploadZone.onFilesSelected keeps working).
 */
export async function pickFilesAsFiles(opts: PickFilesOptions = {}): Promise<File[]> {
  const paths = await pickFiles(opts);
  if (!paths.length) return [];
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const out: File[] = [];
  for (const p of paths) {
    const bytes = await readFile(p);
    const name = p.split(/[\\\\/]/).pop() || 'file';
    out.push(new File([bytes], name));
  }
  return out;
}

/* ───────────────────────────── Persistent store ───────────────────────────── */

/** Lazy plugin-store handle, cached per file name. */
const storeHandles = new Map<string, Promise<unknown>>();

async function loadStore(file: string): Promise<unknown> {
  const { Store } = await import('@tauri-apps/plugin-store');
  return Store.load(file);
}

function getStore(file: string): Promise<unknown> {
  let p = storeHandles.get(file);
  if (!p) {
    p = loadStore(file);
    storeHandles.set(file, p);
  }
  return p;
}

/**
 * Read a key from the on-disk Tauri store.
 * Returns null when running in a browser or when the key is missing.
 */
export async function getStoreValue<T = string>(
  key: string,
  file = 'settings.json'
): Promise<T | null> {
  if (!isTauri()) return null;
  // Lazy interface for the plugin-store API; minimal shape we use.
  interface StoreLike {
    get<T>(k: string): Promise<T | undefined>;
    set<T>(k: string, v: T): Promise<void>;
    delete(k: string): Promise<boolean>;
    save(): Promise<void>;
  }
  const store = (await getStore(file)) as StoreLike;
  const v = await store.get<T>(key);
  return (v === undefined ? null : v) as T | null;
}

/** Write a key to the on-disk Tauri store. */
export async function setStoreValue<T = string>(
  key: string,
  value: T,
  file = 'settings.json'
): Promise<void> {
  if (!isTauri()) return;
  interface StoreLike {
    get<T>(k: string): Promise<T | undefined>;
    set<T>(k: string, v: T): Promise<void>;
    delete(k: string): Promise<boolean>;
    save(): Promise<void>;
  }
  const store = (await getStore(file)) as StoreLike;
  await store.set(key, value);
  await store.save();
}

/** Delete a key from the on-disk Tauri store. */
export async function deleteStoreValue(
  key: string,
  file = 'settings.json'
): Promise<void> {
  if (!isTauri()) return;
  interface StoreLike {
    get<T>(k: string): Promise<T | undefined>;
    set<T>(k: string, v: T): Promise<void>;
    delete(k: string): Promise<boolean>;
    save(): Promise<void>;
  }
  const store = (await getStore(file)) as StoreLike;
  await store.delete(key);
  await store.save();
}

/**
 * Notify the rest of the app that the API key changed.
 * Components can subscribe to invalidate their cached SDK clients.
 */
export const API_KEY_CHANGED_EVENT = 'localpdf:api-key-changed';

export function emitApiKeyChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(API_KEY_CHANGED_EVENT));
}
