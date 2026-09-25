# G1 Safe Web Beta Containment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public web beta truthful and safe by keeping quarantined tools unreachable, aligning privacy copy with registry data flow, removing build-time web AI secrets, and adding production-browser accessibility and smoke gates.

**Architecture:** The feature registry remains the single source of release state and privacy class. A registry-derived notice is rendered by the existing availability gate, so every route gets consistent disclosure without duplicating per-tool metadata. The high-risk AI, OCR, camera, Protect, Decrypt, Blackout, and editor-redaction paths remain disabled; browser tests prove the disabled boundary and make no network request. Playwright runs against the production Vite preview build and owns the new browser gate.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 4, Testing Library, Playwright 1.63, `@axe-core/playwright` 4.13, existing feature registry and tool gate.

---

## Global constraints

- Preserve the editor redaction quarantine and the `/tools/redact-pdf` compatibility alias.
- Do not modify redaction, encryption, or decryption implementations in this plan.
- Do not re-enable AI, OCR, camera, Protect, Decrypt, or Blackout.
- Do not weaken coverage thresholds, add sleeps, skip tests, or increase global timeouts.
- Use the pinned runtime: Node `22.14.0`, npm `11.16.0`.
- Do not commit secrets, `.env` files, or generated browser artifacts.
- Every production behavior change starts with a failing test.

---

### Task 1: Add registry-derived data-handling disclosure

**Files:**
- Create: `src/components/privacy/DataEgressNotice.tsx`
- Create: `src/components/privacy/DataEgressNotice.test.tsx`
- Modify: `src/config/featureRegistry.ts`
- Modify: `src/config/featureRegistry.test.ts`
- Modify: `src/components/tools/ToolAvailabilityGate.tsx`
- Modify: `src/components/tools/ToolAvailabilityGate.test.tsx`
- Modify: `src/components/tools/FileUploadZone.tsx`
- Modify: `src/components/tools/FileUploadZone.test.tsx`
- Modify: `src/pages/home/HomeBento.tsx`
- Modify: `src/pages/Home.test.tsx`
- Modify: `src/components/onboarding/OnboardingTour.tsx`
- Modify: `src/components/onboarding/OnboardingTour.test.tsx`
- Modify: `src/pages/tools/MergePdf.test.tsx`
- Create: `docs/privacy/data-flow.md`

- [ ] **Step 1: Write failing registry and notice tests**

Add to `src/config/featureRegistry.test.ts`:

```ts
import { getToolPrivacyNotice } from './featureRegistry';

it('describes each privacy class without claiming network-free processing', () => {
  expect(getToolPrivacyNotice('merge-pdf')).toMatch(/browser/i);
  expect(getToolPrivacyNotice('merge-pdf')).not.toMatch(/never leave/i);
  expect(getToolPrivacyNotice('ai-summarizer')).toMatch(/unavailable/i);
  expect(getToolPrivacyNotice('ai-summarizer')).toMatch(/Google Gemini/i);
  expect(getToolPrivacyNotice('scan-to-pdf')).toMatch(/camera/i);
  expect(getToolPrivacyNotice('scan-to-pdf')).toMatch(/unavailable/i);
});
```

Create `src/components/privacy/DataEgressNotice.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataEgressNotice from './DataEgressNotice';

describe('DataEgressNotice', () => {
  it('identifies browser-local processing for a local-only tool', () => {
    render(<DataEgressNotice toolId="merge-pdf" />);
    expect(screen.getByRole('note', { name: 'Data handling' })).toHaveTextContent(
      /processed in your browser/i
    );
    expect(screen.getByRole('note', { name: 'Data handling' })).not.toHaveTextContent(
      /never leave/i
    );
  });

  it('names the external destination and unavailable state for AI', () => {
    render(<DataEgressNotice toolId="ai-summarizer" />);
    expect(screen.getByRole('note', { name: 'Data handling' })).toHaveTextContent(
      /unavailable in the public beta/i
    );
    expect(screen.getByRole('note', { name: 'Data handling' })).toHaveTextContent(
      /Google Gemini/i
    );
  });

  it('identifies camera access without requesting it', () => {
    render(<DataEgressNotice toolId="scan-to-pdf" />);
    expect(screen.getByRole('note', { name: 'Data handling' })).toHaveTextContent(
      /camera access is not requested/i
    );
  });
});
```

- [ ] **Step 2: Run the focused tests and verify the expected failures**

Run:

```sh
npx vitest run src/config/featureRegistry.test.ts src/components/privacy/DataEgressNotice.test.tsx
```

Expected: FAIL because `getToolPrivacyNotice` and `DataEgressNotice` do not exist yet.

- [ ] **Step 3: Add one registry-derived privacy helper**

Add this export to `src/config/featureRegistry.ts` without changing any existing release state:

```ts
const PRIVACY_NOTICES: Record<PrivacyClass, string> = {
  'local-only':
    'The selected file is processed in your browser. This tool does not upload the file.',
  'optional-network':
    'This tool is unavailable in the public beta. A future enabled version would send extracted content to Google Gemini only after explicit consent.',
  camera:
    'This tool is unavailable in the public beta. Camera access is not requested.',
};

export function getToolPrivacyNotice(toolId: ToolId): string {
  return PRIVACY_NOTICES[getToolAvailability(toolId).privacy];
}
```

Place the helper after `getToolAvailability` so the registry remains the only source of privacy classification.

- [ ] **Step 4: Implement and integrate the notice**

Create `src/components/privacy/DataEgressNotice.tsx`:

```tsx
import { getToolPrivacyNotice, type ToolId } from '../../config/featureRegistry';

interface DataEgressNoticeProps {
  toolId: ToolId;
}

export default function DataEgressNotice({ toolId }: DataEgressNoticeProps) {
  return (
    <aside
      role="note"
      aria-label="Data handling"
      className="mx-4 mt-4 rounded-md border border-[var(--text-3)]/20 bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-2)]"
    >
      <span className="font-semibold text-[var(--text)]">Data handling: </span>
      {getToolPrivacyNotice(toolId)}
    </aside>
  );
}
```

Import and render it in `ToolAvailabilityGate.tsx` for both the disabled screen and the available workflow. The disabled screen must render it before the limitation paragraph; the available branch must render it before the children.

Remove the absolute sentence from `FileUploadZone.tsx`:

```tsx
<span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
  <span style={{
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--accent-2)',
    display: 'inline-block',
    marginRight: '5px',
  }} aria-hidden="true" />
  Files never leave your device
</span>
```

The registry-derived notice replaces it. Update the existing upload-zone test to assert that the absolute phrase is absent, rather than expecting it.

Change the Home privacy paragraph to:

```tsx
LocalPDF Studio processes most tools in your browser. AI, OCR, and camera tools are currently unavailable in the public beta; no file is sent to an external service from those routes.
```

Change the privacy link destination from `href="#"` to `href="#privacy"`.

The onboarding tour welcome step must not claim absolute local-only behavior. Replace
```tsx
'A privacy-first PDF toolkit that runs entirely in your browser. ' +
'No files are ever uploaded to a server.',
```
with
```tsx
'A privacy-first PDF toolkit that processes most tools in your browser. ' +
'Each tool shows how it handles your file before you start.',
```
and add a test asserting the welcome description contains the new wording and neither absolute claim.

Tool pages render the notice through the route-level `ToolAvailabilityGate` in `App.tsx`, not inside the page component. Update `src/pages/tools/MergePdf.test.tsx` so it asserts the absolute phrase is absent from the page rather than expecting the removed copy; the route-level disclosure is covered by the gate test and the browser suite.

- [ ] **Step 5: Add the data-flow document**

Create `docs/privacy/data-flow.md` with these exact classifications:

```markdown
# Data Flow

| Tool class | Current public behavior | Data boundary |
|---|---|---|
| Local-only | Enabled or limited tools process the selected file in the browser. | File bytes and derived output stay in the browser process. |
| Optional network | AI Summarizer and Translate PDF are unavailable in the public beta. | A future implementation must disclose Google Gemini as the destination and require explicit consent before sending extracted text. |
| Camera | Scan to PDF is unavailable in the public beta. | No camera permission is requested by the current public route. |

Editor history, settings, and consent records are not a substitute for a reviewed retention design. The current beta does not claim durable deletion guarantees beyond the existing browser storage behavior.

The public beta does not send files, prompts, filenames, or images to AI, OCR, or camera services. The disabled routes must remain disabled until a separate implementation plan provides local assets, consent, cancellation, limits, and independent verification.
```

- [ ] **Step 6: Run the focused suite and commit**

Run:

```sh
npx vitest run src/config/featureRegistry.test.ts src/components/privacy/DataEgressNotice.test.tsx src/components/tools/ToolAvailabilityGate.test.tsx src/components/tools/FileUploadZone.test.tsx src/pages/Home.test.tsx
npm run typecheck
npm run lint
```

Expected: all commands pass with zero type or lint errors. Commit only the listed files:

```sh
git add src/config/featureRegistry.ts src/config/featureRegistry.test.ts src/components/privacy src/components/tools/ToolAvailabilityGate.tsx src/components/tools/ToolAvailabilityGate.test.tsx src/components/tools/FileUploadZone.tsx src/components/tools/FileUploadZone.test.tsx src/pages/home/HomeBento.tsx src/pages/Home.test.tsx docs/privacy/data-flow.md
git commit -m "feat: disclose tool data boundaries"
```

---

### Task 2: Make unknown routes and home links accessible

**Files:**
- Create: `src/pages/NotFound.tsx`
- Create: `src/pages/NotFound.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/home/HomeBento.tsx`
- Modify: `src/pages/Home.test.tsx`

- [ ] **Step 1: Write the failing not-found test**

Create `src/pages/NotFound.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';

describe('NotFound', () => {
  it('renders a named heading and a recovery link', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```sh
npx vitest run src/pages/NotFound.test.tsx
```

Expected: FAIL because `NotFound.tsx` does not exist.

- [ ] **Step 3: Implement the semantic not-found page**

Create `src/pages/NotFound.tsx`:

```tsx
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="container mx-auto max-w-2xl px-4 py-20 text-center" aria-labelledby="not-found-title">
      <p className="text-sm font-semibold uppercase tracking-wider text-[var(--text-3)]">404</p>
      <h1 id="not-found-title" className="mt-3 text-3xl font-bold text-[var(--text)]">
        Page not found
      </h1>
      <p className="mt-4 text-[var(--text-2)]">The requested page is not available.</p>
      <Link
        to="/"
        className="mt-8 inline-flex rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-white"
      >
        Return home
      </Link>
    </section>
  );
}
```

Import `NotFound` in `App.tsx` and add the catch-all route inside the layout route:

```tsx
<Route path="*" element={<NotFound />} />
```

Add a Home test that asserts the privacy link points to `#privacy` and the paragraph does not contain `files never leave your browser`.

- [ ] **Step 4: Run focused tests and commit**

Run:

```sh
npx vitest run src/pages/NotFound.test.tsx src/pages/Home.test.tsx src/components/layout/Header.test.tsx
npm run typecheck
npm run lint
```

Expected: all commands pass. Commit:

```sh
git add src/pages/NotFound.tsx src/pages/NotFound.test.tsx src/App.tsx src/pages/home/HomeBento.tsx src/pages/Home.test.tsx
git commit -m "fix: add accessible route recovery"
```

---

### Task 3: Remove build-time web AI secrets and keep AI/OCR unreachable

**Files:**
- Modify: `src/lib/ai.ts`
- Modify: `src/lib/ai.test.ts`
- Modify: `src/components/settings/ApiKeySettings.tsx`
- Modify: `src/vite-env.d.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `src/components/tools/ToolAvailabilityGate.test.tsx`

- [ ] **Step 1: Write failing tests for the web key boundary**

In `src/lib/ai.test.ts`, replace the existing env-only test with:

```ts
it('does not use a build-time web key', async () => {
  vi.stubEnv('VITE_GEMINI_API_KEY', 'must-not-be-used');
  mockGetStoreValue.mockResolvedValueOnce(null);
  vi.resetModules();
  const { getGenAI } = await import('./ai');
  expect(() => getGenAI()).toThrow(/API key not configured/);
  vi.unstubAllEnvs();
});
```

Add this assertion to the disabled-tool matrix in `ToolAvailabilityGate.test.tsx`:

```ts
for (const toolId of ['ai-summarizer', 'translate-pdf', 'ocr-pdf', 'scan-to-pdf'] as const) {
  it(`does not mount ${toolId}`, () => {
    const workflow = vi.fn(() => <div data-testid="workflow-mounted" />);
    render(
      <ToolAvailabilityGate toolId={toolId} toolName="Blocked tool">
        {workflow()}
      </ToolAvailabilityGate>
    );
    expect(workflow).not.toHaveBeenCalled();
    expect(screen.queryByTestId('workflow-mounted')).not.toBeInTheDocument();
  });
}
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```sh
npx vitest run src/lib/ai.test.ts src/components/tools/ToolAvailabilityGate.test.tsx
```

Expected: FAIL on the build-time-key assertion and the new disabled-route assertions before implementation.

- [ ] **Step 3: Remove the web build-time key fallback**

In `src/lib/ai.ts`, make `resolveApiKey` use only the in-memory cache and the Tauri store:

```ts
export async function resolveApiKey(): Promise<string | null> {
  if (apiKeyCache) return apiKeyCache;
  const fromStore = await getStoreValue<string>('geminiApiKey');
  if (fromStore && fromStore.trim()) {
    apiKeyCache = fromStore.trim();
    return apiKeyCache;
  }
  return null;
}
```

Remove the `import.meta.env.VITE_GEMINI_API_KEY` branch from `getGenAI`. The synchronous accessor may use only `apiKeyCache`; when no in-memory key exists it must throw the existing `API key not configured` error.

In `ApiKeySettings.tsx`, set the browser status to `not configured` without reading `import.meta.env`, and replace the browser explanatory text with:

```tsx
'AI tools are unavailable in the public web beta. No API key is stored in the browser.'
```

Remove `VITE_GEMINI_API_KEY` from `src/vite-env.d.ts` and `.env.example`. Update the README feature list, setup instructions, warning block, and environment table to state that AI tools are unavailable in the public web beta and that no browser build key is required or accepted.

Do not change `src/lib/ocr.ts` or `ScanToPdf.tsx`; their routes remain registry-disabled and will be covered by the browser network-isolation test.

- [ ] **Step 4: Run unit tests, typecheck, lint, and a production secret scan**

Run:

```sh
npx vitest run src/lib/ai.test.ts src/components/tools/ToolAvailabilityGate.test.tsx src/components/settings/ApiKeySettings.test.tsx
npm run typecheck
npm run lint
npm run build
$hits = Get-ChildItem -Recurse dist -File | Select-String -Pattern 'VITE_GEMINI_API_KEY|AIza[0-9A-Za-z_-]{20,}'
if ($hits) { $hits | Select-Object Path, LineNumber; throw 'build output contains a Gemini key pattern' } else { 'dist secret scan: clean' }
```

Expected: tests, typecheck, lint, and build pass; the PowerShell scan prints no match and exits zero.

- [ ] **Step 5: Commit**

```sh
git add src/lib/ai.ts src/lib/ai.test.ts src/components/settings/ApiKeySettings.tsx src/vite-env.d.ts .env.example README.md src/components/tools/ToolAvailabilityGate.test.tsx
git commit -m "fix: remove build-time web AI secrets"
```

---

### Task 4: Add production-browser smoke, network isolation, and axe gates

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (generated by npm)
- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`
- Create: `e2e/a11y.spec.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

- [ ] **Step 1: Add the browser test dependencies and scripts**

With the pinned Node/npm runtime, run:

```sh
npm install --save-dev --save-exact @playwright/test@1.63.0 @axe-core/playwright@4.13.0
```

Add this script to `package.json`:

```json
"test:e2e": "playwright test"
```

The lockfile must change only through the pinned npm install.

- [ ] **Step 2: Create the Playwright configuration**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: Write failing browser smoke tests**

Create `e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('home renders a named main heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /LocalPDF Studio/i }).first()).toBeVisible();
});

test('unknown routes render recovery content', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
});

test('disabled security and AI routes never mount a workflow', async ({ page }) => {
  for (const path of ['/tools/protect-pdf', '/tools/decrypt-pdf', '/tools/blackout-pdf', '/tools/ai-summarizer', '/tools/ocr-pdf']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: /unavailable/i })).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  }
});

test('disabled AI and OCR routes issue no service request', async ({ page }) => {
  const serviceRequests: string[] = [];
  const serviceHosts = new Set([
    'generativelanguage.googleapis.com',
    'cdn.jsdelivr.net',
    'unpkg.com',
    'tessdata.projectnaptha.com',
  ]);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (serviceHosts.has(url.hostname)) serviceRequests.push(request.url());
  });
  for (const path of ['/tools/ai-summarizer', '/tools/translate-pdf', '/tools/ocr-pdf', '/tools/scan-to-pdf']) {
    await page.goto(path);
  }
  expect(serviceRequests).toEqual([]);
});

test('the redaction compatibility alias resolves to the quarantined route', async ({ page }) => {
  await page.goto('/tools/redact-pdf');
  await expect(page).toHaveURL(/\/tools\/blackout-pdf$/);
  await expect(page.getByRole('heading', { name: /unavailable/i })).toBeVisible();
});
```

- [ ] **Step 4: Add axe checks**

Create `e2e/a11y.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const path of ['/', '/tools/merge-pdf', '/tools/protect-pdf']) {
  test(`has no automatically detectable violations at ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
```

- [ ] **Step 5: Run the browser tests against the production build**

Run:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

Expected: all smoke and axe tests pass. The test-results and playwright-report directories remain ignored.

- [ ] **Step 6: Add CI installation and execution**

In `.github/workflows/ci.yml`, add the browser install after the existing web build and run:

```yaml
      - name: Install Chromium for browser gates
        run: npx playwright install --with-deps chromium
      - name: Production browser smoke and accessibility gates
        run: npm run test:e2e
```

Document the local commands in `README.md`:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

- [ ] **Step 7: Commit**

```sh
git add package.json package-lock.json playwright.config.ts e2e .github/workflows/ci.yml README.md
git commit -m "test: add production browser safety gates"
```

---

### Task 5: Verify the G1 gate and record evidence

**Files:**
- Create: `docs/release/g1-verification.md`
- Modify: `docs/release/production-inventory.md`

- [ ] **Step 1: Run the complete G0 command set**

Run with the pinned runtime:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run lint
npm run test:coverage
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
npm audit --omit=dev --audit-level=high
```

Expected: every command exits zero; the lockfile remains unchanged; `src/lib` coverage stays at or above 80% lines/functions/statements and 70% branches.

- [ ] **Step 2: Run the G1 browser gates**

Run:

```sh
npx playwright install chromium
npm run test:e2e
```

Expected: all smoke and axe tests pass, with no external request from disabled AI/OCR/camera routes.

- [ ] **Step 3: Verify the security quarantine**

Run:

```sh
git diff dac960a0e62323ae0429f98d49ef11cbf9e67326 -- src/lib/security.ts src/lib/encryption.ts src/components/editor/Toolbar.tsx src/components/editor/annotations/RedactAnnotationItem.tsx
```

Expected: no diff in the redaction/security implementation files.

- [ ] **Step 4: Record exact evidence**

Create `docs/release/g1-verification.md` with the exact commit, runtime versions, test counts, coverage values, Playwright results, axe results, external-request result, and the redaction diff result. State explicitly that AI, OCR, camera, Protect, Decrypt, Blackout, and editor redaction remain unavailable and that G1 does not authorize sensitive-document use.

Update the production inventory to link the G1 design, plan, privacy data-flow document, and verification evidence. Do not change the historical NO-GO audit.

- [ ] **Step 5: Review the whole branch and commit documentation**

Run:

```sh
git diff --check dac960a0e62323ae0429f98d49ef11cbf9e67326
git status --short
```

Review every changed file for secrets, generated artifacts, and redaction implementation changes. Commit:

```sh
git add docs/release/g1-verification.md docs/release/production-inventory.md
git commit -m "docs: record G1 safe web beta evidence"
```

## G1 acceptance

G1 is complete only when all of the following are evidenced:

- Disabled security, AI, OCR, camera, and redaction routes cannot mount a workflow or download state.
- Privacy notices are registry-derived and no absolute local-only claim remains for network/camera flows.
- The production build contains no build-time Gemini key pattern.
- Production-browser smoke, network-isolation, and axe tests pass.
- The G0 gate remains green from the final commit.
- The redaction implementation diff is empty.
- The branch is review-ready; no merge, deployment, tag, or release is performed.
