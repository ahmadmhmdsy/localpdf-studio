# G1 Safe Web Beta — Verification Evidence

**Gate:** G1 (Safe Web Beta containment)
**Branch:** `production-readiness/phase-0`
**Verified code commit:** `519b878` (G0 baseline for this gate: `dac960a`). The full gate set was run on the
tree of `b27fd5c`; `519b878` changes documentation only, and the guards that read that documentation
were re-run afterwards.
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
| `npm run test:coverage` | exit 0 — 91 test files, 705/705 tests |
| `npm run build` | exit 0 |
| `cargo +1.89.0 fmt --manifest-path src-tauri/Cargo.toml -- --check` | exit 0 |
| `cargo +1.89.0 check --manifest-path src-tauri/Cargo.toml` | exit 0 |
| `npm audit --omit=dev --audit-level=high` | exit 0 |
| `npm run test:e2e` | exit 0 — 14/14 browser tests (run with `CI=1` so no stale preview server can be reused) |

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
(91 test files, 686/686 tests at that point in the branch, `src/lib` 89.33/76.81/93.61/89.64, thresholds
unchanged; the final state is recorded below), and the production
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

## Adversarial review remediation (2026-09-25)

An adversarial review of the work at `0358158` found one blocking defect and ten smaller ones. All of
them are fixed in the working tree, each behind a guard that was observed failing first. No commit is
made here: the worktree is left dirty for review, and this section is the evidence record for the
uncommitted state.

### Blocking: the bento home page shipped false absolute claims

`src/pages/home/HomeBento.tsx` is the one surface a visitor sees first, and it asserted things the code
does not do. The claim inventory, verified against both builds (the web bundle and the Tauri desktop
build share `src/config/featureRegistry.ts`, and the desktop build can hold a user-supplied Gemini key
in `tauri-plugin-store`):

| Old claim | Verdict | Now |
|---|---|---|
| `100% on-device` (hero badge) | false in both builds | `Local-first` |
| `...that lives in your browser.` (h1) | wrong for a Tauri WebView | `...that runs on your device.` |
| `7 categories, zero servers touched` | unverifiable, and false in the desktop build | removed; the category count is derived from `TOOL_CATEGORIES` |
| `Nothing persists, nothing phones home.` | false: the editor keeps the working document and edit history in IndexedDB | `Most tools run locally; AI, OCR, and camera tools are unavailable in the public beta.` |
| `0` / `Bytes uploaded` / `Always zero` | a byte count nothing measures | a registry-derived count of *available* tools whose `privacy` is not `local-only` (0 today, in both builds) |
| `No tracking pixels.` | unverifiable by a user, and no analytics code exists to support it | removed; the tile keeps `No account` / `No sign-up. No email.` |
| `Private` (badge) | an unsupportable label | `No account` |
| `aria-label="Privacy guarantee"` | a guarantee the retention note does not make | `Data handling` |
| `Recent` / `aria-label="Recently used"` with `Q3 investor update`, `Q3 asset brief`, `proposal`, `paper notes` | a fabricated user history: the app records no recents | `Quick picks` / `Example tools to try`, chips now describe what each tool does |
| `processes most tools in your browser` | wrong in the desktop build | `processes most tools locally` |
| `clear the stored data for this site in your browser settings` | browser-only removal path | `clear this app's stored data (site data in the browser, app data on the desktop)` |

Claims that hold in **both** builds and were kept: the available-tool count, the 7 categories, that the
three network/camera tools are unavailable, and that no account or email is required. The containment
sentence is unchanged: the AI, OCR, and camera routes are registry-disabled and send nothing to an
external service.

`src/config/releaseClaims.test.ts` grew from 7 tests to 18 to hold this in place. The new guards are
deliberately hard to satisfy by rewording:

- explicit banned patterns (percent on-device, on-device absolutism, all-tools-on-device, zero-server,
  measured-zero-byte egress, nothing-egress, nothing-persists, always-zero, phones-home, no-tracking),
  each with a self-test that proves the pattern matches a known-bad sentence and not its honest twin;
- a rule that every data-handling counter tile must render a value from a JSX expression, so a hard-coded
  `0` cannot be presented as a measurement again;
- an in-page anchor integrity check, because three sidebar links (`#favorites`, `#shortcuts`,
  `#settings`) pointed at elements that do not exist and `#privacy` had no inbound link at all.

### The rest of the findings

| ID | Finding | Fix |
|---|---|---|
| M1 | The e2e gate allowlisted `cdn.jsdelivr.net` and `unpkg.com` for a future OCR enablement, while only Tesseract-shaped asset names were blocked, so any other external fetch passed | the allowlist is gone; a disabled route must now contact **zero** hosts other than the one serving the app, and the OCR re-enablement requirement is recorded as a deliberate, documented change |
| M2 | The chunk matcher relied on Vite naming tool chunks after the page module | a guard re-checks the built `dist/assets` on every run and fails loudly if a disabled tool has no chunk named after it, or if `dist/index.html` preloads one |
| M3 | This document pinned `8c6baae` | re-pinned to `0358158` and this section added |
| M4 | The key-channel guard only checked that `envPrefix` *started with* `VITE_` | the exact set `['VITE_', 'TAURI_']` is asserted, a secret-shaped prefix is rejected, and `src` is scanned for any `import.meta.env.*` reference outside a documented allowlist |
| L1 | The privacy note claimed dead font names were dropped, while `JetBrains Mono` survives in 9 shipped places | the sentence now names what remains and why: 5 rules in `src/theme/skins/bento.css` and 4 inline styles in `HomeBento.tsx`, where the monospace stack is the intended face. `Plus Jakarta Sans` and `DM Mono` are genuinely gone from `src` and `index.html` |
| L2 | Three sidebar links pointed at non-existent anchors, and `#privacy` had no inbound link | `#favorites`, `#shortcuts`, and `#settings` are replaced by two real destinations: `/#quick-picks` and `/#privacy`. `browser-first` in the version line became `local-first` |
| L3 | An unconditional `grid-template-columns: 1fr` made the 780px media query redundant | the media query is removed; verified with a real browser engine that the computed layout of `.bento-privacy-deep` is identical at 8 widths from 375px to 1440px |
| L4 | The accent guard matched only the exact string `var(--accent)` | it now covers `--accent` and `--accent-2`, spacing and fallback forms, and ternaries, with a self-test proving each variant is caught. Two real violations surfaced and were fixed: the bento badge and the saved-file size line, both of which used a status colour with ~2.1-2.5:1 contrast on the light skin |
| L5 | `tauri.conf.json` described the desktop app as running `in your browser` | `shortDescription` is `Edit PDFs locally on your desktop.`, and the release-claim guard now fails if either bundle description reverts to browser wording |
| L6 | The `send nothing to an external service` copy was load-bearing on routing but unguarded | a test derives the Gemini page set from the source tree, requires it to be exactly `ai-summarizer` and `translate-pdf`, requires both to stay `disabled`, requires `src/lib/ai.ts` to be the only `@google/genai` importer, and requires the key settings component to resolve or clear a key without making a model call |

### Guard evidence

Each new guard was observed failing against a deliberate defect, then the defect was reverted:

- **Claim guard:** 6 failures on the unmodified bento page (percent on-device, the hard-coded counter, the
  fabricated recents, the privacy-guarantee label, the dead sidebar anchor, the Tauri description).
- **Zero-external-host assertion:** a `<script src="https://cdn.jsdelivr.net/npm/@fontsource/inter@5/index.js">`
  was added to `index.html` with a matching CSP entry and the app rebuilt. The new assertion failed with
  `"cdn.jsdelivr.net (/npm/@fontsource/inter@5/index.js)"`. The same request passes all three
  pre-existing checks - the worker/OCR asset matcher does not match the name, the host was allowlisted,
  and the font test only knows the two Google hosts - which is precisely the hole. `index.html` was
  restored with `git checkout --` and the app rebuilt.
- **Chunk-naming guard:** `dist/assets/ProtectPdf-BG4EY1GA.js` was renamed to `LegacyRoute-QQQQQQQQ.js`
  and the guard failed with `protect-pdf has no chunk named after it in dist/assets`. The file was
  renamed back.
- **Accent guard:** reintroducing `color: 'var( --accent )'` and `color: 'var(--accent-2)'` each failed
  the scan with the file and line; both were reverted.
- **Gemini containment guard:** `ai-summarizer` was temporarily marked `stable` and the guard failed with
  `AiSummarizer.tsx must stay disabled for the no-egress copy to hold: expected 'stable' to be 'disabled'`.
  The registry was restored and is identical to `HEAD`.

### Command results for this round

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 - 0 errors, 186 warnings, none in the files this round touched |
| `npm run test:coverage` | exit 0 - 91 test files, 705/705 tests (up from 686) |
| `npm run build` | exit 0 - 66 files in `dist/` |
| `CI=1 npm run test:e2e` | 14 passed, 0 failed, 0 retries (8 smoke, 6 axe) |

`dist/` secret scan: the only match is the literal `GEMINI_API_KEY` inside the `@google/genai` chunk,
where the SDK reads that name from its own config at runtime and resolves it to `null`. No key value, and
no `AIza`/`sk-`/private-key pattern, is present. `dist/` font scan: no `fonts.googleapis`, no
`fonts.gstatic`, no `Plus Jakarta`, and no `DM Mono`; the only match is the `@font-face` keyword inside
pdf-lib's custom-font code, which downloads nothing.

## What this gate does not do

- It does not authorize sensitive-document use. Blackout/redaction is still not a confidentiality
  boundary, and the historical NO-GO audit (`PRODUCTION_READINESS_AUDIT.md`,
  `AUDIT_REPORT.md`) is unchanged.
- It does not change any release state in `src/config/featureRegistry.ts`.
- It does not merge, deploy, tag, or release anything. The branch is left review-ready only.
- It does not close the remaining G1 audit findings: nine icon-contrast usages, the `--accent-2`
  based step/spinner/toast states, `index.html` still allowing
  `connect-src https://generativelanguage.googleapis.com`, and keyboard/screen-reader testing
  beyond the automated axe gate. The two raw `--accent-2` *text* usages found by the widened
  token guard (the bento privacy badge and the saved-file size line) are now on `--text-2`; the
  step, spinner, icon, and toast usages remain, and are listed in the accent guard's allowlist
  with their measured contrast so they are pinned rather than ignored.
