# Development environment

Last inspected: 2026-10-25, on the owner's Windows workstation. Refresh this file when it goes stale instead of repeating every check (CLAUDE.md §18).

## Declared by the project

| What | Value | Source |
| --- | --- | --- |
| Node | 22.14.0 | `.nvmrc`, `package.json` engines (`>=22.14.0 <23`), CI matrix |
| npm | 11.16.0 | `package.json` `packageManager` |
| Package manager | npm only (`package-lock.json`); install with `npm ci` | lockfile |
| CI | GitHub Actions `.github/workflows/ci.yml`, `ubuntu-latest`, Node 22.14.0 | workflow |
| Desktop | Tauri 2 (`src-tauri/`), Rust toolchain plus MSVC on Windows | `src-tauri/Cargo.toml` |

## Detected on the workstation

| Tool | Version | Note |
| --- | --- | --- |
| OS | Windows 11 Pro (10.0.26200), x64 | Shells: PowerShell 7 and Git Bash |
| Memory / disk | 48 GiB RAM; about 34 GiB free on `E:` | |
| Node | **24.18.0** | Doesn't match the declared 22.14.0. `npm ci` checks engines, so switch with nvm (or fnm) before installing. CI is the reference. |
| npm | 11.18.0 | Newer than the pinned 11.16.0; lockfile format is the same |
| git | 2.47.1 | `core.autocrlf=true`; repo files are CRLF in the working tree |
| gh | 2.95.0 | Used for PRs |
| Rust / cargo | **not found** | Not on `PATH` and no `~/.cargo`. `npm run cargo:check` and `tauri:*` can't run here; report them as SKIPPED. |
| MSVC | `scripts/with-msvc.cmd` expects VS 2022 Community, MSVC 14.16.27023 and Windows SDK 10.0.22621.0 | Wrapper for cargo commands on Windows |

## Commands

| Check | Command |
| --- | --- |
| Install | `npm ci` |
| Dev server | `npm run dev` (port 3000, binds `0.0.0.0`; see roadmap backlog #12) |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` (about 136 warnings existed at the time of writing; don't add new ones) |
| Unit tests | `npm test` or `npm run test:coverage` (Vitest) |
| Build | `npm run build` |
| Bundle budget | `npm run check:bundle` (after a build) |
| E2E | `npm run test:e2e` (Playwright, `e2e/`) |
| Lighthouse | `npm run test:lhci` (`lighthouserc.js`) |
| Registry | `npx tsx scripts/validate-feature-registry.ts` |
| Rust | `npm run cargo:check` (needs Rust plus MSVC) |

## Services

None. The app runs fully in the browser (or Tauri webview): no database, no backend, no Docker. OCR language data is served from the app's own origin. `.env.example` has only `APP_URL`; the web build accepts no API key.

## Risks and fallbacks

- **Node mismatch.** The local Node 24 differs from the declared 22. Use Node 22.14.0 for anything that touches the lockfile or the build that ships.
- **No Rust here.** Desktop changes can't be checked on this machine; rely on CI or another machine, and say so in the PR.
- **Dev server on all interfaces.** `--host=0.0.0.0` exposes the dev server on the LAN. Use it on trusted networks only until backlog #12 is done.
- **Line endings.** Write files with the repo's existing endings. `docs/roadmap.md` is LF; most other files are CRLF.
