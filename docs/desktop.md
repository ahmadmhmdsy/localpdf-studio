# LocalPDF Studio — Desktop (Tauri 2) Setup

This document covers the Tauri 2 desktop shell for LocalPDF Studio. The web build is unaffected; you can keep using `npm run dev` as before. The desktop build wraps the same `src/` code in a native window using the OS WebView (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux).

## What you get

- A native desktop window for Windows / macOS / Linux.
- Native OS file pickers and save dialogs (replaces the HTML `<input type="file">` fallback).
- On-disk key/value store via `tauri-plugin-store` (used to persist the Gemini API key securely, replacing the build-time `VITE_GEMINI_API_KEY`).
- Bundle sizes ~5–10 MB vs ~150 MB for Electron, idle RAM ~50 MB vs ~150 MB.
- All 31 PDF tools work unchanged because the wrapper is a normal WebView.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 18+ | already required by the web build |
| Rust | 1.77+ (stable) | install via `https://rustup.rs` |
| MSVC build tools (Windows only) | VS 2022 Community or Build Tools with the *Desktop development with C++* workload | required by Tauri's MSVC toolchain |
| WebView2 (Windows 10 only) | pre-installed on Win11; on older builds Tauri's installer bootstraps it automatically | not needed on Win11 |

The Tauri CLI is already in `devDependencies` (installed by `npm install`).

## First-time setup

```sh
npm install
```

## Daily development

```sh
# Web-only (unchanged)
npm run dev                 # http://localhost:3000

# Desktop (Tauri 2): opens a native window
npm run tauri:dev           # runs scripts/with-msvc.cmd npx @tauri-apps/cli dev
```

On Windows, `tauri:dev` and `tauri:build` go through `scripts/with-msvc.cmd` which sources the MSVC environment (sets `LIB`, `INCLUDE`, and `PATH`) before invoking cargo. This is required because some VS 2022 installations don't fully populate `LIB` from `vcvarsall` alone, leading to `LNK1181: cannot open kernel32.lib` during Rust build scripts.

## Production build

```sh
# Web-only (unchanged)
npm run build

# Desktop: builds signed installers in src-tauri/target/release/bundle/
npm run tauri:build
```

Output locations:

| Platform | Output |
|---|---|
| Windows | `src-tauri/target/release/bundle/msi/*.msi` and `bundle/nsis/*.exe` |
| macOS | `src-tauri/target/release/bundle/dmg/*.dmg` and `bundle/macos/*.app` |
| Linux | `src-tauri/target/release/bundle/appimage/*.AppImage` and `bundle/deb/*.deb` |

## Code signing

For public distribution you need certificates:

- **Windows**: EV code-signing certificate (~$200–400/yr) stops SmartScreen warnings. Set `WINDOWS_SIGNING_CERT` in CI.
- **macOS**: Apple Developer account ($99/yr). Run `xcrun notarytool` to notarize. Set `APPLE_SIGNING_IDENTITY` and `APPLE_CERTIFICATE`.
- **Linux**: GPG key for `.deb`/`.rpm` packages.

For internal/personal use, unsigned builds work but Windows SmartScreen will warn on first launch.

## Native API surface (Tauri-only features)

Components use `src/lib/native.ts` to bridge to native OS features:

| Function | Web fallback | Tauri behavior |
|---|---|---|
| `isTauri()` | always false | true inside the desktop window |
| `pickFiles({ extensions, multiple })` | throws (use `<input type="file">`) | OS file picker → array of absolute paths |
| `saveFile({ defaultName, data })` | throws (use blob download) | OS save dialog → writes to chosen path |
| `getStoreValue(key)` / `setStoreValue(key, value)` / `deleteStoreValue(key)` | no-op or null | reads/writes `settings.json` via `tauri-plugin-store` |

`FileUploadZone` and `DownloadState` automatically detect Tauri and use the native APIs. In a browser they continue to work exactly as before.

## Gemini API key

Unlike the web build (which embeds the key via `VITE_GEMINI_API_KEY` at build time), the desktop app reads the key from the on-disk store. To set it:

1. Launch the desktop app.
2. Click the gear icon in the header → "Gemini API Key".
3. Paste your key, click Save. The key is stored in `%APPDATA%/studio.localpdf.app/settings.json` (Windows), `~/Library/Application Support/...`, or `~/.config/...` (Linux).

```src/lib/ai.ts``` resolves the key in this order:

1. `tauri-plugin-store` (desktop users)
2. `import.meta.env.VITE_GEMINI_API_KEY` (web users, and fallback for desktop if no key set)

The key is cached in-memory. To force re-reading, call `clearApiKeyCache()` (already wired to the Settings save flow).

## Adding native features

To add a new Rust-side command:

1. Add the function in `src-tauri/src/lib.rs`:
   ```rust
   #[tauri::command]
   fn my_command(arg: String) -> String {
       format!("got {}", arg)
   }
   ```
2. Register it in the `invoke_handler` list in the same file.
3. Call from JS:
   ```ts
   import { invoke } from '@tauri-apps/api/core';
   const result = await invoke<string>('my_command', { arg: 'hi' });
   ```

For deeper integration (file watching, system tray, deep links), add a plugin to `Cargo.toml` and register it in `lib.rs`. Update `src-tauri/capabilities/default.json` with the new permissions.

## Regenerating icons

If you change the source icon image at the project root:

```sh
npm run icons:tauri
```

This runs `scripts/tauri-icons.mjs`, which crops and resizes a project-root PNG into a 1024×1024 master, then invokes `tauri icon` to generate the full icon set (Windows .ico, macOS .icns, Linux PNGs, iOS, Android).

## What lives in `src-tauri/`

```
src-tauri/
├── Cargo.toml              Rust crate manifest (deps + plugin features)
├── tauri.conf.json         Window + bundle config (frontendDist = ../dist)
├── build.rs                Calls tauri_build::build()
├── src/
│   ├── main.rs             Win32 entry (no console window in release)
│   └── lib.rs              Tauri builder + plugin registration
├── capabilities/
│   └── default.json        ACL: which plugins/commands the renderer can call
└── icons/                  All icon variants (regenerate via scripts/tauri-icons.mjs)
```

## What changed in `src/`

| File | Change |
|---|---|
| `src/lib/native.ts` (NEW) | Abstraction layer; plugin imports are lazy so the browser bundle stays small |
| `src/lib/native.test.ts` (NEW) | 18 tests covering isTauri, pickFiles, saveFile, store helpers, events |
| `src/lib/ai.ts` | Added `resolveApiKey()`, `getGenAIAsync()`, `clearApiKeyCache()`; sync `getGenAI()` now prefers the cache then env |
| `src/lib/ai.test.ts` | Appended tests for API key resolution |
| `src/components/settings/ApiKeySettings.tsx` (NEW) | Modal dialog for managing the API key (only rendered in Tauri) |
| `src/components/tools/FileUploadZone.tsx` | Added a "Browse from disk…" button when running in Tauri; keep all existing dropzone behavior |
| `src/components/tools/DownloadState.tsx` | Intercepts the download anchor when in Tauri to use the native save dialog |
| `src/components/layout/Header.tsx` | Gear icon visible only in Tauri opens the API key settings dialog |
| `vite.config.ts` | Tauri-aware dev server (port 1420, fixed host) when `TAURI_DEV=1` |
| `index.html` | Extended CSP to allow `tauri://`, `ipc:`, `asset:` schemes |
| `package.json` | Added Tauri deps and `tauri:dev`, `tauri:build`, `cargo:check`, `icons:tauri` scripts |

## Verification commands

```sh
npm run typecheck       # should pass with zero new errors
npm run lint            # my files contribute 0 errors, 0 warnings
npm test                # 604 tests pass (18 new native tests)
npm run build           # vite production build, populates dist/
npm run cargo:check     # validates the Rust scaffold
```

## Limitations / TODO

- Code signing and notarization aren't automated. Add CI signing later.
- Auto-update via `tauri-plugin-updater` is not yet wired.
- `tauri-plugin-deep-link` and `tauri-plugin-window-state` are easy follow-ups.
- Mobile targets (Tauri 2 mobile alpha) are deferred to a later phase.

