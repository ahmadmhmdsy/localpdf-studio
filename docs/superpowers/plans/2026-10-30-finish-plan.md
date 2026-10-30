# Finish Plan: From Beta to Production v1

**Date:** 2026-10-30
**Owner:** Ahmad Mahmoud
**Master plan:** [docs/roadmap.md](../../roadmap.md). This file sets the order and the release bar; the roadmap keeps the status of each milestone.

## 1. Where we start

- 31 tools: 5 stable, 18 limited, 8 disabled. Experimental: 0.
- Merged through PR #13. CI passes on `main`.
- 23 UI files still have no `useI18n` call: 21 tool pages, plus `Editor.tsx`, its two sub-components and `NotFound.tsx` (counted with a text search).

## 2. What "production v1" means

v1 is ready when every line below is PASS. Phases C, D and E come after v1 unless the owner moves them.

| # | Criterion | Evidence |
|---|---|---|
| 1 | Every tool is `stable`, `limited` with honest limitations, or `disabled` with truthful copy (Phase A exit) | `production-inventory.md` matches the registry |
| 2 | OCR has its real-file and release-checklist evidence, or is back to `disabled` | A1.4 and A1.5 tables |
| 3 | `compress-pdf` is flipped after A2.2, or stays `disabled` with an owner decision | A2.2 table |
| 4 | Protect, Unlock and Redact are shipped, or blocked only on a recorded decision | A3 and A4 rows |
| 5 | The UI has no user-visible literal outside the locale files, and the owner has reviewed the Arabic copy | B1.5 guard and sign-off |
| 6 | Arabic RTL passes axe with 0 serious or critical nodes on `/`, `/tools/*` and `/editor` | e2e report |
| 7 | All CI checks pass on `main` | CI run |
| 8 | The desktop build compiles | `npm run cargo:check` |
| 9 | A manual pass on real files in a production build covers every `stable` and `limited` tool | A PASS/FAIL table in this file |
| 10 | No production dependency vulnerabilities, and tracked third-party PDFs are dealt with | `npm audit --omit=dev`; decision 13 |

## 3. Work order

### Stage 1: no owner input needed

| Order | Milestone | Done when |
|---|---|---|
| 1 | B1.3c: convert-to pages | Merged with Arabic strings and an RTL check |
| 2 | B1.3d: remaining tool groups, one group per PR | Merged |
| 3 | B1.4: editor, onboarding, toasts, settings, error boundaries, Limitations, NotFound | Merged |
| 4 | B1.5 guard: a test that fails on new literals | Merged |
| 5 | A7.8: finish the sign-pdf wording | Merged |
| 6 | B8: skin and visual bugs | Geometry tests per skin pass (`e2e/skins.spec.ts`) |
| 7 | Dev dependency upgrades (backlog #28), without adding packages | `npm audit` count drops, all checks pass |
| 8 | A6.1: pdf-to-pptx theme part and package test | Unit test passes; the tool stays `disabled` |
| 9 | Verification pass on generated files | Table below filled in |

### Stage 2: waits on the owner

| Blocks | Needed from the owner | Roadmap §8 item |
|---|---|---|
| A1.4, A2.2, then A1.5 | Real English and Arabic scans | — |
| A2.3 | OK to flip `compress-pdf` to `limited` | 2 |
| A3 | Approve the qpdf WASM dependency | 3, 4 |
| A4, C5 | Choose the redaction engine | 5 |
| A5.2, A5.3 | Approve the camera `Permissions-Policy` change | 6 |
| Release gate | `word-to-pdf`, `powerpoint-to-pdf`, `sign-pdf`: `disabled`, or reword the rule | 11 |
| Release gate | Keep OCR at `limited` without evidence, or return it to `disabled` | 12 |
| Repo | Remove the PDFs in `input/` | 13 |
| Redesign | Pick the direction | 10 |
| B1.5 | Review the Arabic copy | — |

### Stage 3: after the decisions

A3 (Protect, Unlock, Repair), A4 (Redaction), A5 (Scan to PDF), then the release flips, one commit each, with the owner's OK per flip.

### Stage 4: after v1

B2–B7, then Phases C, D and E, in roadmap order.

## 4. Rules for this plan

- Never change a `releaseState`, add a dependency, change the CSP or `Permissions-Policy`, or send data off the device without the owner's explicit OK.
- Each PR carries its milestone ID and updates its roadmap row.
- A slice merges only when CI passes on its final commit.
- Passing tests are not evidence of real-file behaviour. Criteria 2, 3 and 9 need real output that someone inspected.

## 5. Verification table

Filled in during stage 1, order 9, and again on real files in stage 3.

| Tool | Generated file | Real file | Notes |
|---|---|---|---|
| — | — | — | Not started |
