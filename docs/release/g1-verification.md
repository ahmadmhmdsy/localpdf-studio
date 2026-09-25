# G1 Safe Web Beta — Verification Evidence

**Gate:** G1 (Safe Web Beta containment)
**Branch:** `production-readiness/phase-0`
**Verified code commit:** `8c6baae` (G0 baseline for this gate: `dac960a`)
**Verified on:** Windows 11 x64
**Pinned runtime:** Node `v22.14.0`, npm `11.16.0`, Rust toolchain `+1.89.0`
**Design:** `docs/superpowers/specs/2026-09-25-g1-safe-web-beta-design.md`
**Plan:** `docs/superpowers/plans/2026-09-25-g1-safe-web-beta.md`
**Privacy model:** `docs/privacy/data-flow.md`

## Scope of this gate

G1 is a containment gate, not a release approval. It proves that the public web beta tells the
truth about data handling, holds no build-time AI secret, keeps every high-risk route
unreachable in a real production browser, and passes automated accessibility checks. It does not
certify the application for sensitive documents, and it does not change any release state.

## Command results

Every command was run from the verified commit with the pinned runtime. All exited zero.

| Command | Result |
|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | exit 0, `package-lock.json` unchanged (SHA-256 identical before and after) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 (0 errors, 185 pre-existing warnings) |
| `npm run test:coverage` | exit 0 — 88 test files, 671/671 tests |
| `npm run build` | exit 0 |
| `cargo +1.89.0 fmt --manifest-path src-tauri/Cargo.toml -- --check` | exit 0 |
| `cargo +1.89.0 check --manifest-path src-tauri/Cargo.toml` | exit 0 |
| `npm audit --omit=dev --audit-level=high` | exit 0 |
| `npm run test:e2e` | exit 0 — 11/11 browser tests |

### Coverage

`src/lib` against the configured thresholds (80 lines/functions/statements, 70 branches):

| Metric | Value | Limit |
|---|---|---|
| Statements | 89.33% | 80 |
| Branches | 76.81% | 70 |
| Functions | 93.61% | 80 |
| Lines | 89.64% | 80 |

Thresholds were not changed by this work.

### Browser gates (`npm run test:e2e`)

Playwright 1.63.0 with `@axe-core/playwright` 4.13.0, `retries: 0`, running against the
production `vite preview` build rather than the dev server. 11 tests passed:

Smoke (5):

- the home route renders a named main heading;
- an unknown route renders "Page not found" and a working "Return home" link to `/`;
- `/tools/protect-pdf`, `/tools/decrypt-pdf`, `/tools/blackout-pdf`, `/tools/ai-summarizer`,
  and `/tools/ocr-pdf` each render the unavailable screen and mount **zero** file inputs;
- `/tools/ai-summarizer`, `/tools/translate-pdf`, `/tools/ocr-pdf`, and `/tools/scan-to-pdf`
  issue **no** request to any service host (Google Gemini, jsDelivr, unpkg, or the Tesseract
  language-data host);
- the `/tools/redact-pdf` compatibility alias still resolves to the quarantined
  `/tools/blackout-pdf` route.

Accessibility (6): axe-core over `/`, `/tools/merge-pdf`, and `/tools/protect-pdf` in **both**
the light and the dark theme, asserting zero violations. No rule was disabled, excluded, or
scoped away. Nodes axe could not decide (translucent backdrops, the ambient-orb layer, gradient
text, and the `opacity-60 grayscale` dimmed cards) are printed by the spec rather than hidden.

### Build output

```
Get-ChildItem -Recurse dist -File | Select-String -Pattern 'VITE_GEMINI_API_KEY|AIza[0-9A-Za-z_-]{20,}'
```

Result: **no match**. The production bundle contains no build-time Gemini key pattern.

### Security quarantine

```
git diff dac960a0e62323ae0429f98d49ef11cbf9e67326 -- src/lib/security.ts src/lib/encryption.ts \
  src/components/editor/Toolbar.tsx src/components/editor/annotations/RedactAnnotationItem.tsx
```

Result: **0 lines**. The redaction, protection, and decryption implementations are unchanged by
G1; the gate works by keeping their routes unavailable, not by altering their code.

## Accessibility remediation

The axe gate initially failed on pre-existing WCAG 1.4.3 defects, so the remediation was made
rather than the rule being weakened. Measured with axe-core 4.13 against the production build:

| Element | Before | After |
|---|---|---|
| Header "Visual Editor" CTA, accent text on accent tint | 2.29:1 | 5.28:1 |
| `StepTrack` active step label (11px mono) | 2.32:1 | 5.35:1 |
| Disabled-tool kicker in `ToolLayout` | 2.54:1 | 5.86:1 |
| White text on accent background (gate "Home", NotFound "Return home") | 2.68:1 | 5.87:1 |
| Focus ring on light surfaces (WCAG 1.4.11) | 2.68:1 | 6.18:1 |

`--accent-text` and `--accent-solid` tokens were added to every theme block that overrides
`--accent`, including the bento skin. A stale comment claiming the brand pink measures ~3.4:1
on light surfaces was measured and found false (2.36-2.68:1), so it was corrected.

Known remaining limitations, recorded rather than hidden: nine icon/stroke usages keep the raw
brand pink below the 3:1 non-text bar; the completed-step and spinner states still use
`--accent-2`; and axe reports `incomplete` rather than `violation` for text over translucent
backdrops, gradient text, and the dimmed unavailable cards.

## Containment statement

The following remain **unavailable** in the public web beta, by registry release state and the
route-level gate in `src/App.tsx`:

- AI Summarizer and Translate PDF (no build-time or browser-stored key; a future enabled version
  would send extracted content to Google Gemini and must add explicit consent first);
- OCR PDF and Scan to PDF (camera);
- Protect PDF, Decrypt PDF, and Blackout PDF;
- the editor redaction workflow.

Both compatibility aliases (`/tools/redact-pdf`, `/tools/unlock-pdf`) still resolve, and
`/tools/redact-pdf` still lands on the quarantined blackout route.

## What this gate does not do

- It does not authorize sensitive-document use. Blackout/redaction is still not a confidentiality
  boundary, and the historical NO-GO audit (`PRODUCTION_READINESS_AUDIT.md`,
  `AUDIT_REPORT.md`) is unchanged.
- It does not change any release state in `src/config/featureRegistry.ts`.
- It does not merge, deploy, tag, or release anything. The branch is left review-ready only.
- It does not close the remaining G1 audit findings: nine icon-contrast usages, the `--accent-2`
  based step/spinner/toast states, `index.html` still allowing
  `connect-src https://generativelanguage.googleapis.com`, and keyboard/screen-reader testing
  beyond the automated axe gate.
