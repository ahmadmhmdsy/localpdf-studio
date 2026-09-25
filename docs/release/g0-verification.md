# Gate G0 Verification Record

**Verification revision:** `1a7715588296ee6eeef76b01ed5d7f46d54b0f48` (dependency-remediation baseline; final staged follow-up recorded below)

**Branch:** `production-readiness/phase-0`

**Runtime:** Node `v22.14.0`, npm `11.16.0`

**Date:** 2026-09-25

**Task:** Phase 0 Task 6 — dependency remediation follow-up

## Gate result

# **G0 LOCAL EVIDENCE READY; REMOTE TRANSITION PENDING**

The final post-classification local command set is recorded below, including three exact serial repetitions of the resource-bounded coverage script after an earlier default run hit a timing failure. The local production audit exited `0` with zero vulnerabilities. Phase 0 is not declared complete until a clean-checkout GitHub Actions run of the final review-ready revision is green.

## Required command results

The table below records the historical dependency-remediation baseline. The post-classification G0 install uses the exact locked command shown in the final verification section; the baseline `npm ci` row is retained as historical evidence rather than the authoritative G0 install result.

| Command | Exit | Duration | Result |
|---|---:|---:|---|
| `npm ci` (historical baseline; not the G0 install gate) | `0` | `58.510s` | PASS; 569 packages added and lockfile SHA-256 unchanged before/after. Full install reported 13 findings in the complete graph and install-script policy warnings; the exact omit-dev gate is reported below. |
| `npm run typecheck` | `0` | `27.206s` | PASS; no TypeScript diagnostics. |
| `npm run lint` | `0` | `27.379s` | PASS; 0 errors, 185 existing warnings across 209 files. |
| `npm run test:coverage` | `0` | `162.090s` | PASS; 85 test files and 658 tests passed. Overall report: 57.40% statements, 50.87% branches, 53.76% functions, 58.42% lines. `src/lib`: 89.26% statements, 77.10% branches, 93.61% functions, 89.69% lines. |
| `npm run build` | `0` | `65.328s` | PASS; 2,694 modules transformed; Vite built in 56.66s. Existing large-chunk warning remains for `pdf-lib` and `office-parsers`. |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | `0` | `2.246s` | PASS; no output. |
| `npm run cargo:check` | `0` | `27.696s` | PASS; Cargo finished the dev profile in 24.48s. |
| `npm audit --omit=dev --audit-level=high` | `0` | `2.856s` | **PASS; found 0 vulnerabilities.** |
| `git status --short` | `0` | — | PASS; tracked worktree clean before this documentation update. |

The focused compatibility suite was also run in isolation: 8 test files and 79 tests passed. An initial concurrent run failed before executing tests because Vitest workers timed out under resource contention; the exact command passed when rerun alone.

Exact dependency and validation details are retained in the ignored report `.superpowers/sdd/goal-round-2-dependency-implementer-report.md`. The tracked remediation commit is `1a7715588296ee6eeef76b01ed5d7f46d54b0f48` (`fix: remediate production dependency audit findings`).

## CI-aligned local verification

After CI was expanded to enforce the authoritative G0 set, the workflow-shaped install and checks were run locally under Node `22.14.0` / npm `11.16.0`:

- `npm ci --ignore-scripts --no-audit --no-fund`: exit `0` in 27.998s; 569 packages added; lockfile SHA-256 unchanged.
- `npm run typecheck`: exit `0` in 21.527s.
- `npm run lint`: exit `0` in 11.876s; 0 errors and 185 warnings.
- `npm run test:coverage`: exit `0` in 177.091s; 85 test files and 658 tests passed; configured `src/lib` thresholds passed.
- `npm run build`: exit `0` in 82.173s; 2,694 modules transformed; existing large-chunk warnings remain.
- `cargo +1.89.0 fmt --manifest-path src-tauri/Cargo.toml -- --check`: exit `0` in 0.628s.
- `cargo +1.89.0 check --manifest-path src-tauri/Cargo.toml`: exit `0` in 63.556s.
- `npm audit --omit=dev --audit-level=high`: exit `0` in 1.597s; found 0 vulnerabilities.

The CI workflow also installs the pinned Rust 1.89.0 toolchain and Linux Tauri system dependencies before the Rust checks. A remote clean-checkout GitHub Actions run has not been executed in this local session; the local evidence above is not a substitute for that required CI transition.

## Final runtime-classification verification

After the Tauri API/dialog/filesystem/store dependency classification, the locked install and non-test gates were rerun:

- `npm ci --ignore-scripts --no-audit --no-fund`: exit `0` in 41.927s; 569 packages added; lockfile SHA-256 unchanged.
- `npm run typecheck`: exit `0` in 52.211s.
- `npm run lint`: exit `0` in 58.110s; 0 errors and 185 warnings.
- `npm run build`: exit `0` in 55.836s; 2,694 modules transformed; existing large-chunk warnings remain.
- `npm audit --omit=dev --audit-level=high`: exit `0` in 2.618s; found 0 vulnerabilities.
- `cargo +1.89.0 fmt --manifest-path src-tauri/Cargo.toml -- --check`: exit `0` in 0.220s.
- `cargo +1.89.0 check --manifest-path src-tauri/Cargo.toml`: exit `0` in 2.104s.
- `npm run cargo:check`: exit `0` in 5.172s; the Windows wrapper passed locally.

The default post-classification `npm run test:coverage` run was not treated as green: it failed one `Home.test.tsx` heading assertion at the 5-second test timeout after 198.420s (84 files passed, 1 failed; 657 tests passed, 1 failed). The same Home file passed 19/19 with one Vitest worker. The package script now embeds Vitest's supported `--maxWorkers=1` resource envelope. Three fresh exact `npm run test:coverage` runs were then executed sequentially under the pinned Node `22.14.0` / npm `11.16.0` runtime:

- Run 1: exit `0` in `347.694s`; 85/85 test files and 658/658 tests passed.
- Run 2: exit `0` in `263.402s`; 85/85 test files and 658/658 tests passed.
- Run 3: exit `0` in `285.132s`; 85/85 test files and 658/658 tests passed.

All three runs passed the configured `src/lib` thresholds: 89.26% statements, 77.10% branches, 93.61% functions, and 89.69% lines. The overall report was 57.40%/50.87%/53.76%/58.42% for runs 1–2 and 57.45%/50.87%/53.76%/58.48% for run 3 (statements/branches/functions/lines). This is a deterministic load-control mitigation, not a root-cause repair; no global timeout increase, blanket retry, disabled test, or test assertion weakening was introduced. The remote clean-checkout CI run remains the transition gate.

## Dependency remediation

Only `package.json` and `package-lock.json` changed in the remediation commit:

- Build/test-only packages were moved to `devDependencies`: `@tailwindcss/vite`, `@types/dompurify`, `@vitejs/plugin-react`, `@vitest/coverage-v8`, and `dotenv`.
- Targeted lockfile updates refreshed React Router, DOMPurify, Mammoth/xmldom, fflate, nanoid, protobufjs and its subpackages, ws, tmp, and brace-expansion lines; `@google/genai` was updated from 1.45.0 to 1.52.0.
- No application source, redaction quarantine code, Rust files, or release-claim files changed in the remediation commit.
- `npm audit fix` was not run.

## CI and Rust MSRV remediation

- `.github/workflows/ci.yml` now runs the complete G0 command set, installs the pinned Rust 1.89.0 toolchain with rustfmt, and installs Linux Tauri build dependencies before `cargo check`.
- On Linux CI, direct `cargo check --manifest-path src-tauri/Cargo.toml` is the portable equivalent of the local Windows `npm run cargo:check` wrapper (`scripts\with-msvc.cmd`); the wrapper is not invoked on Ubuntu.
- The shipped Tauri API and the dialog, filesystem, and store plugins imported by `src/lib/native.ts` are classified as production `dependencies`; the Tauri CLI remains development-only, so the production audit covers the native bridge packages.
- The `test:coverage` script intentionally passes Vitest's supported `--maxWorkers=1` resource envelope. This is a deterministic load-control mitigation for the observed Home timeout; it is not a global test-timeout increase or a blanket retry.
- `src-tauri/Cargo.toml` now declares `rust-version = "1.89.0"`. The prior 1.77.2 minimum could not parse the current locked `edition2024` dependencies and was rejected by `cargo check`; the current pinned toolchain passes the crate check.

## Warnings and residual risks

- `npm ci` reports 13 findings in the full development graph; these are not the Gate G0 production-only result.
- `npm ci` emitted npm allow-scripts warnings for six packages and several upstream deprecation warnings.
- Lint passed with 185 warnings and no errors.
- Vite emitted the existing large-chunk warning; no threshold or chunking change was made in this task.
- Overall coverage remains below the aggregate `src/lib` coverage, while the configured `src/lib` gate passes.
- The coverage run emitted the existing Tesseract legacy-build warning.
- Rust vulnerability auditing and packaged Tauri runtime smoke tests remain outside this G0 command set.

## Phase 0 evidence referenced

- Task 1: `.superpowers/sdd/task-1-report.md`; `874c823d2b96f337c9ea696e6b61f43f7ade83d7` (`docs: establish production remediation inventory`) and `57bdb16bbb47b39f0c8f5c92fe57f4acd2fe82c1` (`chore: keep subagent progress ledger untracked`).
- Task 2: `.superpowers/sdd/task-2-report.md`; `3493b7fea2774734792d747024cb036edcb841c5` (`feat: gate unsafe tools behind truthful availability states`), `cbbfc3adea55e8e9564e17f755eb50f3e194dce6` (`fix: keep bento availability messaging truthful`), and `99de3639274b3948d3f2d7297435a6c9959542cf` (`fix: make tool availability status accessible`).
- Task 3: `.superpowers/sdd/task-3-report.md`; `38c3f04c452ada3d90a1409a1bd2da8562d070b7`.
- Task 4: `.superpowers/sdd/task-4-report.md`; `1e117b3e7312830a63ea39c3f29f5c91dfc836f6`.
- Task 5: `.superpowers/sdd/task-5-report.md`; `456ebc7db2d990b675f25ff67f4978d89e64ce67`.
- Task 6 remediation: `.superpowers/sdd/goal-round-2-dependency-implementer-report.md`; `1a7715588296ee6eeef76b01ed5d7f46d54b0f48`.

## Remaining workflow gate

The final local G0 evidence is now complete for the resource-bounded coverage script: all three exact repetitions passed. The remaining G0 transition gate is a clean-checkout GitHub Actions run of the final review-ready revision. The historical privacy contradiction and later G1–G4 security, platform, accessibility, and release work remain outside this foundation gate. No merge, push, deploy, tag, signing, or publication is authorized or performed.
