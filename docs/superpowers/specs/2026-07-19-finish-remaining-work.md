# "What's NOT Done" — Source Spec for TASK-28

**Created:** 2026-07-19
**Owner:** TASK-28 (pending approval)
**Companion plan:** `docs/superpowers/plans/2026-07-19-finish-remaining-work.md`

## Purpose

Catalogue every remaining gap from the 2026-07-19 codebase audit that did **not** land in TASK-27, so that TASK-28 has a single inventory to execute against.

## Scope (in)

- High-severity CVE in `pdfjs-dist` (GHSA-hq66-cqwq-w95j)
- TASK-27 PR 2 tail: `no-explicit-any` enforcement + `react-signature-canvas` swap
- TASK-27 PR 5 tail: deeper assertions on edit/security tests + mock-style consistency
- TASK-26 P0 (dark mode Editor refactor — 211 hardcoded colors)
- TASK-26 P1 (a11y finishing — focus trap, 44 px touch, focus-visible)
- TASK-26 P2 (responsive — Header drawer, viewport safe-area)
- TASK-26 P3 (visual polish — 15 tool pages)
- Workspace hygiene: untracked files, lint warning cleanup

## Out of scope (parked)

- PR 7 future: PDF/A WASM validator, Web Worker thumbnail offload, full dark-shim migration
- Any new tool features
- Backend / server work

## Inventory

| # | Item | Source | Severity | Phase |
|---|------|--------|----------|-------|
| 1 | `pdfjs-dist` CVE GHSA-hq66-cqwq-w95j | `npm audit` | High | Phase 0 |
| 2 | 94 `no-explicit-any` warnings | `npm run lint` | Medium | Phase 1.1 |
| 3 | `react-signature-canvas@1.1.0-alpha.2` | `package.json` | Medium | Phase 1.2 |
| 4 | `edit.test.ts` Uint8Array-only assertions | audit | Medium | Phase 2.1 |
| 5 | `security.test.ts` Uint8Array-only assertions | audit | Medium | Phase 2.2 |
| 6 | Mock style inconsistency (`pdfjs.test.ts`, `image.test.ts`) | audit | Low | Phase 2.3 |
| 7 | 211 hardcoded Tailwind colors in Editor (15 files) | audit | High (UX) | Phase 3 |
| 8 | ConfirmModal missing focus trap | audit | High (a11y) | Phase 4.1 |
| 9 | Toolbar buttons <44 px | audit | Medium | Phase 4.2 |
| 10 | `:focus-visible` low contrast | audit | Medium | Phase 4.3 |
| 11 | Header overflows mobile | audit | Medium | Phase 5.1 |
| 12 | Viewport missing safe-area | audit | Low | Phase 5.2 |
| 13 | 15 tool pages use template aesthetic | audit | Low | Phase 6 |
| 14 | Untracked files cluttering root | `git status` | Low | Phase 8.1 |
| 15 | 247 ESLint warnings (incl. `.agents/` false positives) | `npm run lint` | Low | Phase 8.2 |

## Quality bar (TASK-28 done means)

- `npm audit` → 0 high / 0 critical
- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors, warnings < 50
- `npm test` → all pass (558+ today)
- `npm run test:coverage` → `src/lib/**` ≥80/70/80/80
- `npm run build` → succeeds
- `grep` for hardcoded Tailwind colors in `src/` → 0 matches
- Workspace root contains no stray reference docs / backups
