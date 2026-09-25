# Redaction Review Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the remaining editor-redaction claims and add direct regression coverage without changing dependencies, the canonical blackout route, or Gate G0 evidence.

**Architecture:** Keep the runtime quarantine and legacy `RedactAnnotation` compatibility code unchanged. Filter legacy redaction selections out of the properties panel, make the Home and keyboard tests exercise the actual former paths, and make release-facing copy explicitly describe the dedicated blackout/redaction workflow as unavailable rather than as a confidentiality capability.

**Tech Stack:** React 19, TypeScript 5.8, Vitest 4, Testing Library, Node 22.14.0, npm 11.16.0.

---

## Global constraints

- Work on `production-readiness/phase-0`; preserve history and do not reset, amend, merge, push, tag, sign, deploy, or publish.
- Do not modify `package.json`, `package-lock.json`, `src/lib/security.ts`, the blackout workflow, coverage thresholds, or `docs/release/g0-verification.md`.
- Keep the canonical `blackout-pdf` release state `disabled` and keep legacy `RedactAnnotation` deserialization compatibility.
- Use test-first changes: add each regression assertion, run it and observe the expected failure, then make the smallest implementation/copy change.
- Do not stage ignored `.superpowers/sdd/` evidence.

## File map

- Modify: `src/components/editor/PropertiesPanel.tsx` — hide legacy redaction selection/active-tool state from the generic properties heading.
- Modify: `src/components/editor/PropertiesPanel.test.tsx` — assert no legacy redaction label.
- Modify: `src/pages/Home.test.tsx` — assert the blackout card remains on the disabled dedicated route and no editor redaction link exists.
- Modify: `src/pages/home/HomeBento.tsx` — remove disabled redaction from the alternate skin's search examples.
- Modify: `src/pages/home/HomeBento.test.tsx` — guard the alternate skin's search placeholder and route links.
- Modify: `design-preview/designs/01-hero.html` — remove the stale editor-redaction marketing example.
- Modify: `src/pages/Editor.test.tsx` — dispatch a real Ctrl+R `keydown` through the shortcut hook and assert it cannot select redaction.
- Modify: `src/components/onboarding/OnboardingTour.tsx` — remove the available-tool redaction claim and the unconditional availability wording.
- Modify: `src/components/onboarding/OnboardingTour.test.tsx` — guard the revised step copy.
- Modify: `README.md` — state the editor capabilities accurately and disclose the disabled dedicated workflow.
- Modify: `src/constants/tools.ts` — replace the blackout capability claim with unavailable/non-boundary wording.
- Modify: `src-tauri/tauri.conf.json` — remove `redact` from the package capability description and state the disabled limitation.
- Create: `src/config/releaseClaims.test.ts` — guard all release-facing claims against reintroducing the quarantined capability.

---

### Task 1: Add failing regression coverage

**Files:**
- Modify the five existing tests listed in the file map.
- Create `src/config/releaseClaims.test.ts`.

- [x] **Step 1: Add the PropertiesPanel label assertion.**

Append to the existing legacy-record test:

```tsx
expect(screen.queryByText('redact Settings')).not.toBeInTheDocument();
expect(screen.getByText(/Select a tool or an element on the canvas/i)).toBeInTheDocument();
```

- [x] **Step 2: Add the Home route guard.**

Add under `describe('Links')`:

```tsx
it('keeps blackout on its disabled dedicated route, not the editor redaction query', () => {
  renderHome();
  const blackout = screen.getByRole('link', { name: /blackout pdf/i });

  expect(blackout).toHaveAttribute('href', '/tools/blackout-pdf');
  expect(blackout).toHaveAttribute('aria-disabled', 'true');
  expect(
    screen.getAllByRole('link').some((link) => link.getAttribute('href')?.includes('redact-pdf')),
  ).toBe(false);
});
```

Add the equivalent href assertion to `src/pages/home/HomeBento.test.tsx` so the alternate Home skin cannot reintroduce the editor redaction query.

- [x] **Step 3: Add the physical keyboard guard.**

Change the Editor test shortcut mock to call the actual `useKeyboardShortcuts` implementation while retaining the capture, import `fireEvent`, and add:

```tsx
it('does not activate redaction from a physical Ctrl+R event', async () => {
  renderEditor('/editor');
  await waitFor(() => expect(shortcutCapture.current.length).toBeGreaterThan(0));
  setActiveTool.mockClear();

  fireEvent.keyDown(window, { key: 'r', ctrlKey: true });

  expect(setActiveTool).not.toHaveBeenCalled();
});
```

Keep the existing query assertion and add `expect(setActiveTool).toHaveBeenCalledWith('select')` to prove the legacy query resolves to a safe tool.

- [x] **Step 4: Add the onboarding copy guard.**

Add:

```tsx
it('does not advertise redaction as an available tool', async () => {
  const user = userEvent.setup();
  render(<OnboardingTour forceShow />);

  await user.click(screen.getByRole('button', { name: /next step/i }));
  expect(screen.getByText(/shows its current availability before you choose a tool/i)).toBeInTheDocument();
  expect(screen.queryByText(/availability and limitations/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/redact/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/every tool is one click away/i)).not.toBeInTheDocument();
});
```

- [x] **Step 5: Add the release-claim guard.**

Create `src/config/releaseClaims.test.ts` with Node `readFileSync` and `resolve`, parse `src-tauri/tauri.conf.json`, import `TOOL_CATEGORIES`, read the onboarding, Home, HomeBento, feature-registry, and design-preview surfaces, and assert both the required disclosures and absence of positive redaction claims:

```tsx
expect(readme).not.toMatch(/full editor with[^.]*redaction tools/i);
expect(readme).not.toMatch(/redact sensitive content/i);
expect(longDescription).not.toMatch(/sign,\s*redact,\s*compress/i);
expect(blackout?.description).toMatch(/unavailable/i);
expect(blackout?.description).toMatch(/confidentiality boundary/i);
expect(blackout?.description).not.toMatch(/permanently remove|un-extractable/i);
expect(readme).toMatch(/dedicated blackout\/redaction[^.]*disabled/i);
expect(longDescription).toMatch(/dedicated blackout\/redaction[^.]*disabled/i);
```

- [x] **Step 6: Add the stale active-tool and design-preview guards.**

Add a `PropertiesPanel.test.tsx` case with `activeTool: 'redact'` and read the tracked design preview in `releaseClaims.test.ts`; both must fail before their corresponding copy/guard fixes.

- [x] **Step 7: Run the focused tests and verify RED.**

Run:

```powershell
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" test -- --run src/components/editor/PropertiesPanel.test.tsx src/pages/Home.test.tsx src/pages/home/HomeBento.test.tsx src/pages/Editor.test.tsx src/components/onboarding/OnboardingTour.test.tsx src/config/releaseClaims.test.ts
```

Expected: the new assertions fail against the current redaction label/copy; existing unrelated assertions remain unchanged.

---

### Task 2: Make the minimal implementation and copy changes

**Files:**
- Modify `src/components/editor/PropertiesPanel.tsx`.
- Modify the five existing tests and six release-facing source/config files from the file map (including the alternate Home skin and static design preview).

- [x] **Step 1: Filter legacy redaction state in PropertiesPanel.**

Change the selected annotation lookup to exclude `type === 'redact'` and make `hasContent` false for the stale `activeTool === 'redact'` case. Do not remove the compatibility type or rewrite stored data.

- [x] **Step 2: Correct onboarding copy.**

Replace the second step description with copy that lists available examples without `redact` and accurately says each card shows its current availability. Do not claim every tool is one click away.

- [x] **Step 3: Correct README copy.**

Change the editor feature line to list text, drawing, image, and signature tools. Change the security line to state that the dedicated blackout/redaction workflow is currently disabled and is not a confidentiality boundary.

- [x] **Step 4: Correct the tool-card description.**

Replace the blackout description with unavailable/non-boundary wording. Keep the `blackout-pdf` id, icon, category, and disabled registry state unchanged.

- [x] **Step 5: Correct the Tauri package description.**

Remove `redact` from the capability list and append the same truthful disabled-workflow limitation. Keep the rest of the package metadata unchanged.

- [x] **Step 6: Remove the stale design-preview examples.**

Replace the tracked static design-preview redaction examples with registry-available examples. Do not modify the gated `BlackoutPdf.tsx` implementation or enable its disabled route.

- [x] **Step 7: Run the focused tests and verify GREEN.**

Run the same pinned Vitest command. Expected: all focused tests pass, with no failures in unrelated editor, Home, onboarding, or release-claim assertions.

---

### Task 3: Review and validate the fix wave

**Files:**
- Review the complete diff from `22f9994` through the new fix commit.
- Keep `.superpowers/sdd/` reports untracked.
- Treat the disabled/gated `BlackoutPdf.tsx` implementation as out of scope for this editor-quarantine wave; do not expose or improve it.

- [x] **Step 1: Run changed-file lint and typecheck.**

```powershell
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" run typecheck
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" run lint
```

Expected: exit 0 for both; report any existing warnings without converting them into errors.

- [x] **Step 2: Run the full test suite and build.**

```powershell
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" test -- --run
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" run build
```

- [x] **Step 3: Run an independent code review before any commit.**

Provide the reviewer the complete diff and the requirements above. Resolve all Critical and Important findings, then re-review. Do not treat self-review as approval.

- [x] **Step 4: Verify repository state and Gate status.**

Confirm `git diff --check`, clean scope, no dependency/lockfile changes, and the unchanged G0 record still says `G0 NOT PASSED`. Do not run `npm audit fix`.
