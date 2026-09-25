# Gate G0 Verification Record

**Verification revision:** `456ebc7db2d990b675f25ff67f4978d89e64ce67`

**Branch:** `production-readiness/phase-0`

**Runtime:** Node `v22.14.0`, npm `11.16.0`

**Date:** 2026-09-25

**Task:** Phase 0 Task 6

## Gate result

# **G0 NOT PASSED**

The required production audit command failed. The other required commands completed successfully, but Gate G0 is blocked until the audit failure is remediated and the complete evidence pass is repeated.

## Required command results

| Command | Exit | Duration | Result |
|---|---:|---:|---|
| `npm ci` | `0` | `102.265s` | PASS; 570 packages installed; install output reported 23 vulnerabilities (2 low, 7 moderate, 14 high) and five install-script policy warnings. |
| `npm run typecheck` | `0` | `55.460s` | PASS; no TypeScript diagnostics. |
| `npm run lint` | `0` | `95.170s` | PASS; 0 errors, 173 warnings. |
| `npm run test:coverage` | `0` | `213.199s` | PASS; 82 files/642 tests. Overall coverage: 54.45% statements, 48.05% branches, 51.40% functions, 55.48% lines. `src/lib`: 89.26%, 77.10%, 93.61%, 89.69% respectively. |
| `npm run build` | `0` | `111.992s` | PASS; 2,696 modules; Vite built in 1m 44s. Two chunks exceeded 800 kB. |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | `0` | `4.035s` | PASS; no output. |
| `npm run cargo:check` | `0` | `85.227s` | PASS; Cargo finished the dev profile in 1m 16s. |
| `npm audit --omit=dev --audit-level=high` | **`1`** | `22.123s` | **FAIL; 20 vulnerabilities (2 low, 6 moderate, 12 high).** |
| `git status --short` | `0` | `0.382s` | PASS; empty before this documentation change. |

Exact raw output is retained in the ignored report `.superpowers/sdd/task-6-report.md` and its referenced `task-6-logs/` directory. No large logs or secrets are copied into this tracked record.

## Warnings and residual risks

- `npm ci` reported 23 total audit findings before the required production-only audit command.
- The failed audit output included both production-looking package paths and development-tool paths despite `--omit=dev`; no reachability conclusion is made here. The non-zero command result is the authoritative gate failure.
- `npm audit fix` was not run and no dependencies were changed.
- Lint passed with 173 warnings.
- Vite emitted two large-chunk warnings: `pdf-lib` (910.13 kB) and `office-parsers` (1,814.14 kB).
- Coverage passed the configured gate; global coverage remains substantially below the `src/lib` aggregate.
- The coverage run emitted the existing Tesseract legacy-build warning repeatedly.
- Rust vulnerability auditing, full development audit, and packaged Tauri runtime smoke tests are outside this G0 command set.

## Phase 0 evidence referenced

- Task 1: `.superpowers/sdd/task-1-report.md`; `874c823d2b96f337c9ea696e6b61f43f7ade83d7` (`docs: establish production remediation inventory`) and `57bdb16bbb47b39f0c8f5c92fe57f4acd2fe82c1` (`chore: keep subagent progress ledger untracked`).
- Task 2: `.superpowers/sdd/task-2-report.md`; `3493b7fea2774734792d747024cb036edcb841c5` (`feat: gate unsafe tools behind truthful availability states`), `cbbfc3adea55e8e9564e17f755eb50f3e194dce6` (`fix: keep bento availability messaging truthful`), and `99de3639274b3948d3f2d7297435a6c9959542cf` (`fix: make tool availability status accessible`).
- Task 3: `.superpowers/sdd/task-3-report.md`; `38c3f04c452ada3d90a1409a1bd2da8562d070b7` (`build: restore reproducible npm installation`).
- Task 4: `.superpowers/sdd/task-4-report.md`; `1e117b3e7312830a63ea39c3f29f5c91dfc836f6` (`build: make static quality gates deterministic`).
- Task 5: `.superpowers/sdd/task-5-report.md`; `456ebc7db2d990b675f25ff67f4978d89e64ce67` (`test: remove timing-dependent suite failures`).

The full command-level record, including exact output excerpts, Rust output, warning details, and gate consequences, is in `.superpowers/sdd/task-6-report.md`.

## Required follow-up

Triage the failed audit in a separate authorized dependency/security task. Do not run an unreviewed blanket `npm audit fix`. After remediation, repeat the complete Gate G0 evidence pass from a clean checkout and update this record only with a newly captured result.
