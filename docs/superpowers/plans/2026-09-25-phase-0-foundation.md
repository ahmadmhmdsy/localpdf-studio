# Phase 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Each task uses a fresh implementer and a separate spec/quality reviewer.

**Goal:** Establish a reproducible, deterministic, and safely contained LocalPDF Studio baseline that passes Gate G0 before security or feature remediation begins.

**Architecture:** Start from the audited revision, preserve all existing routes and demo behavior except for explicitly disabled unsafe tools, introduce one feature-release registry, synchronize the npm lockfile under the declared Node runtime, make static/test gates deterministic, and record clean verification evidence.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 4, React Router 7, Tauri 2/Rust, npm, GitHub Actions.

---

## Global constraints

- Work in `E:\js_projects\localpdf-studio` on branch `production-readiness/phase-0`.
- Base commit is `8f9f63b`; preserve all audit/evidence documents created before implementation.
- Do not use real user documents, credentials, API keys, or external AI services.
- Do not add product features. This phase only establishes safe defaults, reproducibility, and deterministic gates.
- Use Node `22.14.0` and npm `11.16.0` for installation and validation.
- Follow TDD for source changes: capture RED, implement the minimum correct change, capture GREEN.
- Do not weaken TypeScript, ESLint, Vitest, or coverage settings to make checks pass.
- Do not commit `node_modules`, `dist`, `coverage`, `src-tauri/target`, `.superpowers`, secrets, or unrelated files.
- Do not delete or overwrite unrelated user files.
- Keep the two compatibility redirects (`redact-pdf` and `unlock-pdf`) working.
- Each implementation task must end with a focused self-review and one coherent commit.

## Verified starting conditions

- `.nvmrc` requests Node 22; the audit ran under Node 24.18.0.
- `fnm` has Node 22.14.0 installed.
- npm CLI 11.16.0 can be run under Node 22.14.0.
- `package.json` and `package-lock.json` are out of sync.
- `.npmrc` contains `package-lock=false`.
- Clean-tree typecheck and lint fail before Phase 0.
- Tests are timing/order sensitive and have passed and failed across repeated runs.
- `PRODUCTION_READINESS_AUDIT.md`, the master plan, and synthetic evidence exist but are uncommitted.

### Task 1: Establish the remediation baseline and production inventory

**Files:**
- Create: `docs/release/production-inventory.md`
- Modify: `.gitignore`
- Add to the Task 1 commit: `PRODUCTION_READINESS_AUDIT.md`
- Add to the Task 1 commit: `docs/superpowers/plans/2026-09-25-production-readiness-master-plan.md`
- Add to the Task 1 commit: `docs/superpowers/plans/2026-09-25-phase-0-foundation.md`
- Add to the Task 1 commit: `audit-evidence/README.md`
- Add to the Task 1 commit: `audit-evidence/sample.xlsx`

- [ ] Verify the current branch is `production-readiness/phase-0` and HEAD is `8f9f63b` before staging.
- [ ] Read `PRODUCTION_READINESS_AUDIT.md` and extract the 31 tool assessments.
- [ ] Create the inventory with columns: tool ID, user-facing name, audited state, release state, privacy class, owner workstream, enabling evidence, and known limitation.
- [ ] Use exactly these release states:
  - `stable`: merge-pdf, pdf-to-jpg, rotate-pdf, crop-pdf, compare-pdf.
  - `limited`: split-pdf, remove-pages, extract-pages, organize-pdf, repair-pdf, jpg-to-pdf, html-to-pdf, word-to-pdf, excel-to-pdf, powerpoint-to-pdf, pdf-to-pdfa, pdf-to-word, pdf-to-excel, add-page-numbers, add-watermark, edit-pdf, sign-pdf.
  - `disabled`: scan-to-pdf, compress-pdf, ocr-pdf, pdf-to-powerpoint, blackout-pdf, decrypt-pdf, protect-pdf, ai-summarizer, translate-pdf.
  - `experimental`: none.
- [ ] Assign owner workstreams using these concrete roles: Foundation, PDF Security, Privacy/AI/OCR, Tauri Platform, Conversion Correctness, Editor/Accessibility, Release Engineering.
- [ ] Record baseline environment and failing gate evidence from the audit; do not rerun long builds in this task.
- [ ] Add `.superpowers/` to `.gitignore` so the durable SDD ledger and review packages remain local scratch.
- [ ] Confirm exactly the listed documentation/evidence files plus `.gitignore` are staged.
- [ ] Commit as `docs: establish production remediation inventory`.

**Acceptance:** The branch contains the audit, plans, inventory, and synthetic evidence; no application source is changed; SDD scratch is ignored.

### Task 2: Quarantine tools that currently misrepresent success

**Files:**
- Create: `src/config/featureRegistry.ts`
- Create: `src/config/featureRegistry.test.ts`
- Create: `src/components/tools/ToolAvailabilityGate.tsx`
- Create: `src/components/tools/ToolAvailabilityGate.test.tsx`
- Modify: `src/constants/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/home/HomeBento.tsx`

- [ ] Write `featureRegistry.test.ts` first and verify RED because the registry does not exist.
- [ ] Define the following public types and API:

```ts
export type ReleaseState = 'stable' | 'limited' | 'disabled' | 'experimental';
export type PrivacyClass = 'local-only' | 'optional-network' | 'camera';
export type ToolId =
  | 'merge-pdf'
  | 'split-pdf'
  | 'remove-pages'
  | 'extract-pages'
  | 'organize-pdf'
  | 'scan-to-pdf'
  | 'compress-pdf'
  | 'repair-pdf'
  | 'ocr-pdf'
  | 'jpg-to-pdf'
  | 'html-to-pdf'
  | 'word-to-pdf'
  | 'excel-to-pdf'
  | 'powerpoint-to-pdf'
  | 'pdf-to-jpg'
  | 'pdf-to-pdfa'
  | 'pdf-to-word'
  | 'pdf-to-excel'
  | 'pdf-to-powerpoint'
  | 'rotate-pdf'
  | 'add-page-numbers'
  | 'add-watermark'
  | 'crop-pdf'
  | 'edit-pdf'
  | 'sign-pdf'
  | 'blackout-pdf'
  | 'compare-pdf'
  | 'decrypt-pdf'
  | 'protect-pdf'
  | 'ai-summarizer'
  | 'translate-pdf';

export interface ToolAvailability {
  releaseState: ReleaseState;
  privacy: PrivacyClass;
  support: string;
  limitation: string;
}

export const TOOL_RELEASE_REGISTRY: Record<ToolId, ToolAvailability>;
export function getToolAvailability(toolId: ToolId): ToolAvailability;
export function isToolAvailable(toolId: ToolId): boolean;
```

- [ ] Populate the registry with the exact state groups from Task 1. Every entry must have non-empty support/limitation text; use “No known blocking limitation for the narrow workflow” for stable entries.
- [ ] Assign privacy classes: AI tools are `optional-network`; scan-to-pdf is `camera`; all other current tools are `local-only` for Phase 0.
- [ ] Add registry tests that compare `TOOL_RELEASE_REGISTRY` keys with the 31 IDs, enforce exact state groups, reject empty text, and verify disabled tools return false.
- [ ] Run `npx vitest run src/config/featureRegistry.test.ts`; expected GREEN.
- [ ] Write `ToolAvailabilityGate.test.tsx` first and verify RED for missing stable/limited/disabled behavior.
- [ ] Implement `ToolAvailabilityGate` with these exact semantics:
  - stable: render children unchanged;
  - limited: render children plus a visible, non-blocking limitation alert;
  - disabled: do not render children; render a `ToolLayout` with the tool name, an unavailable heading, the registry limitation, and a Home link.
- [ ] Run `npx vitest run src/components/tools/ToolAvailabilityGate.test.tsx`; expected GREEN.
- [ ] Change `Tool.id` in `src/constants/tools.ts` from `string` to `ToolId` and import the type from the registry.
- [ ] Update `ToolRoute` in `App.tsx` to accept `toolId: ToolId` and wrap every tool element in `ToolAvailabilityGate`; keep all 31 routes and both aliases.
- [ ] Update both Home skins to display `Limited` or `Unavailable` status and prevent unavailable cards from navigating to an active workflow. Direct routes must still show the truthful unavailable screen.
- [ ] Add a test assertion that unavailable messages do not claim success, security, completeness, or local processing.
- [ ] Run focused registry/gate tests, all affected page/component tests, and `npm run build`.
- [ ] Commit as `feat: gate unsafe tools behind truthful availability states`.

**Acceptance:** Direct navigation to a disabled tool cannot mount its workflow or reach processing/download state; limited tools disclose limitations; stable behavior is unchanged.

### Task 3: Restore deterministic installation and Node policy

**Files:**
- Modify: `.npmrc`
- Modify: `.nvmrc`
- Modify: `package.json`
- Regenerate: `package-lock.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] Record the current `npm ci --dry-run` EUSAGE failure as RED.
- [ ] Remove `package-lock=false` from `.npmrc`, leaving `save-exact=true`.
- [ ] Set `.nvmrc` to exactly `22.14.0`.
- [ ] Add these package declarations:

```json
"engines": {
  "node": ">=22.14.0 <23",
  "npm": ">=11.16.0 <12"
},
"packageManager": "npm@11.16.0"
```

- [ ] Update CI to use Node 22.14.0, enable Corepack, activate npm 11.16.0, and run `npm ci` before all checks.
- [ ] Document `fnm install`, `fnm use`, `node --version`, and `npm --version` setup in `AGENTS.md` and README.
- [ ] Regenerate the lockfile under Node 22.14.0/npm 11.16.0 with scripts/audit/funding disabled:

```powershell
$NpmCli = Join-Path (Split-Path (Get-Command node).Source) 'node_modules\npm\bin\npm-cli.js'
fnm exec --using=22.14.0 -- node $NpmCli install --package-lock-only --ignore-scripts --no-audit --no-fund
```

- [ ] Inspect the lockfile diff and confirm it contains all root dependencies from package.json; do not perform unrelated major upgrades.
- [ ] Run two clean installs with scripts disabled under the pinned runtime; both must PASS.
- [ ] Run one normal `npm ci` under the pinned runtime; expected PASS.
- [ ] Run `npm run typecheck`, `npm run lint`, and `npm test`; record whether pre-existing Phase 0 defects remain. Do not fix them in this task.
- [ ] Commit as `build: restore reproducible npm installation`.

**Acceptance:** `npm ci` succeeds repeatedly from the committed lockfile under Node 22.14.0/npm 11.16.0; CI uses the same runtime; no dependency version is intentionally upgraded beyond lock synchronization.

### Task 4: Make typecheck and lint deterministic

**Files:**
- Modify: `tsconfig.json`
- Modify: `eslint.config.js`
- Modify: `src/components/onboarding/OnboardingTour.tsx`
- Modify: `src/components/editor/Canvas.tsx`
- Modify: `src/components/editor/SortableThumbnail.tsx`
- Modify: `src/components/ToolErrorBoundary.tsx`
- Modify: only source/test files named by current compiler/linter output

- [ ] Run `npm run typecheck` and save the complete error list as RED.
- [ ] Run `npm run lint` and save the complete error list as RED.
- [ ] Add explicit TypeScript roots so generated Rust output cannot enter the program:

```json
"include": ["src", "vite.config.ts", "vitest.config.ts"],
"exclude": ["node_modules", "dist", "coverage", "src-tauri"]
```

- [ ] Add ESLint ignores for `dist/**`, `coverage/**`, `src-tauri/target/**`, `.superpowers/**`, and `audit-evidence/**` while retaining `.agents/**`.
- [ ] Fix OnboardingTour declaration order without changing tour behavior.
- [ ] Fix Canvas/SortableThumbnail callback variance with accurate handler parameter types; do not use `any` or weaken TypeScript options.
- [ ] Add required override modifiers and replace unknown caught values with the repository's explicit error normalization pattern.
- [ ] Correct the security test PDF mock so `drawText` has the actual test-used signature; do not exclude the test from checking.
- [ ] Run `npm run typecheck`; expected PASS.
- [ ] Run `npm run lint`; expected PASS with zero errors. Warnings may be reported but must not be hidden.
- [ ] Run `npm run tauri:build`; expected PASS on Windows.
- [ ] Rerun typecheck and lint after Tauri generation; both must remain PASS without scanning `src-tauri/target`.
- [ ] Commit as `build: make static quality gates deterministic`.

**Acceptance:** Typecheck and lint are identical before and after a Tauri build and have zero errors without compiler/rule weakening.

### Task 5: Stabilize unit and integration tests

**Files:**
- Modify: only flaky test files and shared test helpers identified by reproduction
- Modify: production code only when a test reveals a real defect
- Candidate files: `src/tests/utils.tsx`, `vitest.config.ts`, `src/pages/tools/RemovePages.test.tsx`, `src/pages/tools/PdfToPowerpoint.test.tsx`, `src/pages/tools/ExcelToPdf.test.tsx`, `src/pages/tools/PdfToExcel.test.tsx`

- [ ] Use Node 22.14.0 to run each known flaky file three times with verbose reporting; record exact failing tests and outputs.
- [ ] Fix shared test-state leakage first: reset Zustand stores, providers, mocks, object URLs, fake timers, and module state between tests.
- [ ] Replace arbitrary sleeps with `waitFor`, `findBy*`, explicit worker completion, or user-visible state transitions.
- [ ] For `ExcelToPdf` and `PdfToExcel`, assert the actual settled state/output rather than intermediate mock call order.
- [ ] For `RemovePages` and `PdfToPowerpoint`, make test completion deterministic and remove timing races.
- [ ] Do not weaken assertions, add blanket retries, disable tests, or change production behavior solely to satisfy mocks.
- [ ] Run every repaired test file three consecutive times; all must PASS.
- [ ] Run the complete test suite three consecutive times; all must PASS.
- [ ] Run `npm run test:coverage`; all 79 files/current tests must pass and configured thresholds must remain unchanged.
- [ ] Commit as `test: remove timing-dependent suite failures`.

**Acceptance:** Known files and the complete suite pass three consecutive times, coverage remains enabled, and no test relies on ordering or arbitrary delay.

### Task 6: Record Gate G0 verification

**Files:**
- Create: `docs/release/g0-verification.md`
- Reference: all Phase 0 task reports and commits

- [ ] Start from a clean working tree except ignored SDD scratch.
- [ ] Run a normal `npm ci` under Node 22.14.0/npm 11.16.0.
- [ ] Run `npm run typecheck`; record PASS and output.
- [ ] Run `npm run lint`; record PASS and warning count.
- [ ] Run `npm run test:coverage`; record file/test counts and coverage totals.
- [ ] Run `npm run build`; record PASS, duration, and chunk warnings.
- [ ] Run `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`.
- [ ] Run `npm run cargo:check`.
- [ ] Run `npm audit --omit=dev --audit-level=high`; record PASS. Full dev audit and Rust audit remain Phase 6 tasks.
- [ ] Confirm `git status --short` contains no unexpected generated/source changes.
- [ ] Record commit SHA, runtime versions, exact commands, outcomes, and remaining warnings in `docs/release/g0-verification.md`.
- [ ] Commit as `docs: record Gate G0 verification`.

**Acceptance:** Every G0 command passes on the committed Phase 0 state and the evidence is reproducible from the document.
