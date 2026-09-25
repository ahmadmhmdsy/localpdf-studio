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
| `npm run test:coverage` | exit 0 — 91 test files, 686/686 tests |
| `npm run build` | exit 0 |
| `cargo +1.89.0 fmt --manifest-path src-tauri/Cargo.toml -- --check` | exit 0 |
| `cargo +1.89.0 check --manifest-path src-tauri/Cargo.toml` | exit 0 |
| `npm audit --omit=dev --audit-level=high` | exit 0 |
| `npm run test:e2e` | exit 0 — 13/13 browser tests (run with `CI=1` so no stale preview server can be reused) |

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
production `vite preview` build rather than the dev server. 13 tests passed:

Smoke (7):

- the home route renders a named main heading;
- an unknown route renders "Page not found" and a working "Return home" link to `/`;
- the registry still marks the containment-sensitive tools disabled, so the containment
  assertions cannot pass over an emptied list;
- `/tools/protect-pdf`, `/tools/decrypt-pdf`, `/tools/blackout-pdf`, `/tools/ai-summarizer`,
  and `/tools/ocr-pdf` each render the unavailable screen and mount **zero** file inputs;
- every registry-disabled route loads **no** quarantined tool chunk (its own
  `react.lazy` code-split asset), **no** Tesseract/OCR language asset and **no** PDF.js worker,
  and contacts **no** host outside an explicit allowlist (only `cdn.jsdelivr.net` and `unpkg.com`,
  which a future OCR enablement would need, plus the local preview host);
- no route contacts a Google Fonts host, because the app now ships no third-party asset of any
  kind;
- the `/tools/redact-pdf` compatibility alias still resolves to the quarantined
  `/tools/blackout-pdf` route.

The chunk/worker assertion was verified to be non-vacuous: with the availability gate
scratch-disabled and the bundle rebuilt, the same test failed and named the nine disabled tool
chunks it observed being fetched (`AiSummarizer-*.js`, `OcrPdf-*.js`, `ScanToPdf-*.js`,
`CompressPdf-*.js`, `PdfToPowerpoint-*.js`, `BlackoutPdf-*.js`, `DecryptPdf-*.js`,
`ProtectPdf-*.js`, `TranslatePdf-*.js`). The gate was then restored and the test passed again.
Note that the app shell itself modulepreloads only the entry, `core`, `pdf-lib`, and `ai`
chunks, so the matcher cannot trip on the shell.

Accessibility (6): axe-core over `/`, `/tools/merge-pdf`, and `/tools/protect-pdf` in **both**
the light and the dark theme, asserting zero violations. No rule was disabled, excluded, or
scoped away. Nodes axe could not decide (translucent backdrops, the ambient-orb layer, gradient
text, and the `opacity-60 grayscale` dimmed cards) are printed by the spec rather than hidden.

### Build output

```
Get-ChildItem -Recurse dist -File | Select-String -Pattern 'VITE_GEMINI_API_KEY|AIza[0-9A-Za-z_-]{20,}|fonts.googleapis.com|fonts.gstatic.com'
```

Result: **no match**. The production bundle contains no build-time Gemini key pattern.

Widening the pattern to the bare variable name `GEMINI_API_KEY` matches exactly one file,
`dist/assets/ai-*.js`, and the match is the `@google/genai` vendor code reading its own
environment variable name (`Be("GEMINI_API_KEY")`), not key material. `vite.config.ts` no longer
defines `process.env.GEMINI_API_KEY` at all and no longer calls `loadEnv`, so there is no
build-time value that could be inlined; `src/config/viteKeyChannel.test.ts` fails the build if
either channel returns.

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

Known remaining limitations, recorded rather than hidden: purely decorative accent uses
(borders, the ambient glow, the progress ring, and the decorative file glyph in Merge PDF) stay on
the raw `--accent`; the completed-step and spinner states still use `--accent-2`; and axe reports
`incomplete` rather than `violation` for text over translucent backdrops, gradient text, and the
dimmed unavailable cards.

The adversarial review that followed this gate found five remaining **text** usages on the raw
`--accent` token, all below the 3:1 non-text bar and therefore below the 4.5:1 text bar: the
`ProcessingState` percentage label and active step dot, the skin-picker check mark, the Merge PDF
drag-handle and remove-button hover text, and the `ApiKeySettings` key icon. They now use
`--accent-text` (or `--accent-solid` for the step dot, matching `StepTrack`).
`src/theme/accentTextTokens.test.ts` scans every non-test `src` file and fails if a raw
`--accent` text usage reappears, with a per-usage allowlist for documented decorative cases.

## Follow-up: third-party font egress and editor retention copy

These two defects were found during the adversarial review of this branch, after the first pass of
this document was written. They are fixed on this branch, and every number below was re-measured by
a final full gate run with the pinned runtime (Node `22.14.0`, npm `11.16.0`) on Windows 11 x64.

**What was found.** `index.html` declared two Google Fonts `preconnect` hints and a stylesheet. The
stylesheet completed on every page view, so a visitor's IP address and user agent reached Google, while
every `fonts.gstatic.com` font file was refused by the shipped CSP (`font-src 'self' data:`), so the UI
already rendered the system stack. Separately, the bento home skin rendered a large `0` above "The
number of bytes we keep of your work." while `src/store/documentStore.ts` writes the opened document's
bytes, name, and type to IndexedDB and `src/store/annotationsStore.ts` writes the edit history, both
restored on mount by `src/contexts/EditorContext.tsx`.

**What changed.** The two `preconnect` hints and the stylesheet were removed from `index.html`; the two
dead family names were dropped from the inline component styles that referenced them, keeping the same
generic fallback that was already rendering; the e2e allowlist no longer contains the font hosts; and the
bento privacy block now states that the editor keeps the working document and edit history in the local
storage of that browser until the reader clears it, naming the editor's **Close File** control (document
keys) and clearing the stored data for the site (everything) as the two real removal paths. No retention
period is claimed and no disabled tool was re-enabled.

**Measured before/after (Chromium, production `vite preview` build).** Computed `font-family` for
`body` and `h1` is identical on every route before and after:
`ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`.
The inline element stacks changed from `"Plus Jakarta Sans", sans-serif` to `sans-serif` and from
`"DM Mono", monospace` to `monospace`; both resolve to the same generic family as before, because the
quoted names never resolved. Requests to font hosts per route went from 26 to 0, and the only host
contacted on `/`, `/tools/merge-pdf`, `/tools/ocr-pdf`, and an unknown route is now the serving origin.

**Gates.** The new browser test `no route requests a Google Fonts host` failed first with 103 observed
font requests, and `src/config/dataFlowDisclosure.test.ts` plus the new bento retention test in
`src/pages/home/HomeBento.test.tsx` also failed before the fix. After the fix:
`npm run build` exit 0, `CI=1 npm run test:e2e` exit 0 with 13/13 tests, `npm run typecheck` exit 0,
`npm run lint` exit 0 (0 errors, the same 185 pre-existing warnings), `npm run test:coverage` exit 0
(91 test files, 686/686 tests, `src/lib` 89.33/76.81/93.61/89.64, thresholds unchanged), and the production
`dist` contains neither a Gemini key pattern nor any font host, family name, or external `<link>`.

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
