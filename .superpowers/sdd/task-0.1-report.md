# Task 0.1 Report — Bump pdfjs-dist for CVE

**Status:** DONE_WITH_CONCERNS
**Date:** 2026-07-19 (worktree session)

## Commits

- `961ff37` fix(deps): bump pdfjs-dist to ^6.2.108 for GHSA-hq66-cqwq-w95j

**BASE → HEAD:** `1b09fc4..961ff37`

## Files changed

```
 package-lock.json | 129 ++++++++++++++++++++++++++++--------------------------
 package.json      |   2 +-
 2 files changed, 69 insertions(+), 62 deletions(-)
```

## What changed

`package.json`:`pdfjs-dist` `^5.5.207` → `^6.2.108`
`npm install` regenerated `package-lock.json` (129 lines diff).

## Quality-gate results

| Gate | Command | Result |
|---|---|---|
| Version | `npm ls pdfjs-dist` | `pdfjs-dist@6.2.108` ✅ |
| Audit (CVE check) | `npm audit` | pdfjs-dist GHSA-hq66-cqwq-w95j **gone** (confirmed absent in 14-vuln report). 14 pre-existing vulns remain in other packages (@babel/core, brace-expansion, dompurify, esbuild, js-yaml, nanoid, postcss, protobufjs, react-router, tmp, undici, vite, ws) — all unrelated to pdfjs-dist. |
| Tests | `npm test` | `Test Files 72 passed (72) | Tests 520 passed (520)` ✅ |
| Build | `npm run build` | `✓ built in 24.85s` ✅ |
| Typecheck | `npm run typecheck` | 0 errors ✅ (run separately, no output) |

> **Note on test count:** The plan stated "558 passed" but the actual run produced **520**. The worktree was branched from master HEAD `1b09fc4` (the last commit) which is before TASK-27's uncommitted test additions. The master worktree has more tests (558) because of those uncommitted new test files. From the worktree's HEAD, 520 is the full count.

## pdfjs API check

Read both files post-bump. No API changes needed.

**`src/lib/pdfjs.ts`** (full file, 6 lines): unchanged API usage:
```ts
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
export { pdfjsLib };
```

**`src/lib/image.ts`** uses the same API surface as 5.x:
- `pdfjsLib.getDocument({ data: arrayBuffer }).promise` (line 13, 54, 80)
- `page.getPage(i)` (line 19, 55, 85)
- `page.getViewport({ scale })` (line 20, 56, 87)
- `page.render({ canvasContext, viewport }).promise` (line 30-33, 65-68, 97-100)

All three call sites compiled (typecheck green) and the test suite for `src/lib/image.test.ts` passed. **No code edits required.**

## Concerns

1. **Plan acceptance criterion overstated.** The plan claimed "npm audit returns 0 vulnerabilities" but the codebase has 14 pre-existing vulns in other packages (@babel/core, brace-expansion, dompurify, esbuild, js-yaml, nanoid, postcss, protobufjs, react-router, tmp, undici, vite, ws) that were not addressed by this task and are out of scope for TASK-28's inventory. The pdfjs-dist CVE itself is fixed; the rest of the audit baseline remains. If TASK-28 wants a clean audit, that needs a separate `npm audit fix` pass which is **not** part of the current plan.

2. **Test count gap.** Tests in worktree: 520. Tests in master: 558 (mentioned in plan). The 38-test delta is TASK-27's uncommitted work. Not a regression — TASK-27's tests will land when master's WIP is committed, or as part of later TASK-28 phases.

3. **Build chunk growth.** `pdf-lib` chunk grew from 878 KB → 910 KB after the bump. Within the existing 800 KB warning threshold (chunk is now larger than the limit, which is informational). No action needed.

4. **No rollback needed.** pdfjs 6.x backward-compatible for the consumed API. The `as any` casts in `image.ts` would normally be flagged by the (planned) `no-explicit-any` rule in Phase 1.1; they remain unchanged here per Phase 1.1's scope.

## Files NOT in commit (intentionally)

Per plan Step 8, only `package.json` + `package-lock.json` were committed. The following remain in the working tree:
- `.superpowers/` (SDD scratch — gitignored)
- `docs/superpowers/plans/2026-07-19-finish-remaining-work.md` (the plan itself)
- `docs/superpowers/specs/2026-07-19-finish-remaining-work.md` (the spec itself)

These will be committed in a separate housekeeping commit later (likely Phase 8.1).
