import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { TOOL_RELEASE_REGISTRY, type ToolId } from '../src/config/featureRegistry';

type RegistryEntry = [ToolId, (typeof TOOL_RELEASE_REGISTRY)[ToolId]];

// Playwright runs from the project root, which is also the working directory its
// webServer command and the rest of the repository's source guards assume.
const projectRoot = process.cwd();
const assetsDir = join(projectRoot, 'dist', 'assets');
const distIndexHtml = join(projectRoot, 'dist', 'index.html');

/** The web build the preview server serves. */
const hasBuiltAssets = existsSync(assetsDir) && existsSync(distIndexHtml);

const readBuiltAssets = (): { chunks: string[]; html: string } => ({
  chunks: readdirSync(assetsDir).filter((name) => name.endsWith('.js')),
  html: readFileSync(distIndexHtml, 'utf8'),
});

/**
 * Every tool the registry marks `disabled`, read from the registry itself so a new
 * quarantined tool is covered here automatically. The list is asserted non-empty and
 * checked for the containment-sensitive tools in the first test, so an emptied or
 * narrowed registry cannot make the assertions below vacuous.
 */
const DISABLED_TOOL_IDS: ToolId[] = (Object.entries(TOOL_RELEASE_REGISTRY) as RegistryEntry[])
  .filter(([, availability]) => availability.releaseState === 'disabled')
  .map(([toolId]) => toolId);

/** The host serving the preview build: the only host a route may contact. */
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

/**
 * Font hosts the shipped app must never contact. The app renders with system font
 * stacks only, so any request here is third-party egress on every page view and a
 * privacy regression. This is a named-host check on purpose: it covers the *enabled*
 * routes, which the disabled-route test does not visit.
 */
const FORBIDDEN_FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

const toUrl = (requestUrl: string) => {
  try {
    return new URL(requestUrl);
  } catch {
    return null;
  }
};

/**
 * Chunk file names are derived from the tool page module (`ocr-pdf` ->
 * `OcrPdf-<hash>.js`), so comparing the id without separators matches the built
 * asset regardless of hash or casing. React.lazy only fetches a tool chunk when the
 * component renders, so a match means a disabled workflow actually mounted.
 *
 * This is a naming convention, not a guarantee, and the test below re-checks it
 * against the built output so it cannot quietly stop matching: if a bundler change
 * renames or merges chunks, Signal 1 turns into a no-op instead of a real check.
 */
const matchesToolChunk = (pathname: string, toolId: ToolId) =>
  new RegExp(toolId.replace(/-/g, ''), 'i').test(pathname);

/**
 * OCR language data, the Tesseract bundle, and the PDF.js worker are only ever
 * fetched by a running tool workflow, never by the app shell or the unavailable
 * screen. `dist/index.html` modulepreloads only the entry, `core`, `pdf-lib` and
 * `ai` chunks, so none of these are shell assets.
 */
const matchesWorkerAsset = (url: string) => /tesseract|pdf\.worker|traineddata|tessdata/i.test(url);

test('the built assets still follow the tool chunk naming convention', () => {
  test.skip(!hasBuiltAssets, 'dist/ is not built; run the build first to check this');
  const { chunks, html } = readBuiltAssets();

  // Non-vacuous: the built app really does emit per-tool chunks.
  expect(chunks.length).toBeGreaterThan(5);

  for (const toolId of DISABLED_TOOL_IDS) {
    const matching = chunks.filter((chunk) => matchesToolChunk(chunk, toolId));
    expect(
      matching,
      toolId +
        ' has no chunk named after it in dist/assets, so \'no quarantined tool chunk' +
        ' was fetched\' cannot detect it. Check the manualChunks map in vite.config.ts.',
    ).not.toEqual([]);
  }

  // The shell must not preload a quarantined chunk either, which is the other way
  // Signal 1 can be defeated without a request ever being made to a disabled route.
  const preloaded = [...html.matchAll(/(?:modulepreload|src)="[^"]*assets\/([^"]+)"/g)].map(
    (match) => match[1],
  );
  const quarantinedPreloads = preloaded.filter((asset) =>
    DISABLED_TOOL_IDS.some((toolId) => matchesToolChunk(asset, toolId)),
  );
  expect(quarantinedPreloads, 'dist/index.html preloads a disabled tool chunk').toEqual([]);
});

test('home renders a named main heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /LocalPDF Studio/i }).first()).toBeVisible();
});

test('no route requests a Google Fonts host', async ({ page }) => {
  const fontRequests: string[] = [];
  page.on('request', (request) => {
    const url = toUrl(request.url());
    if (url !== null && FORBIDDEN_FONT_HOSTS.has(url.hostname)) fontRequests.push(request.url());
  });

  for (const path of ['/', '/tools/merge-pdf', '/tools/ocr-pdf', '/does-not-exist']) {
    await page.goto(path);
  }

  expect(fontRequests, 'a route contacted a Google Fonts host').toEqual([]);
});

test('unknown routes render recovery content', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
});

test('the registry still marks the containment-sensitive tools as disabled', () => {
  expect(DISABLED_TOOL_IDS.length).toBeGreaterThan(0);
  for (const toolId of [
    'ai-summarizer',
    'translate-pdf',
    'scan-to-pdf',
    'protect-pdf',
    'decrypt-pdf',
    'blackout-pdf',
  ] satisfies ToolId[]) {
    expect(DISABLED_TOOL_IDS, toolId).toContain(toolId);
  }
});

test('the OCR route mounts its workflow and contacts only the app host', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  await page.goto('/tools/ocr-pdf');
  await expect(page.getByRole('heading', { name: /OCR PDF/i }).first()).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(1);

  // Mounting the workflow alone does not pull the OCR engine: the worker, WASM
  // core and language data load only when a run starts, so opening the tool stays
  // cheap. The run itself - including that every one of its requests stays on the
  // app origin - is covered by e2e/ocr.spec.ts.
  expect(requested.filter((requestUrl) => matchesWorkerAsset(requestUrl))).toEqual([]);

  const externalHosts = requested
    .map(toUrl)
    .filter((url): url is URL => url !== null && /^https?:$/.test(url.protocol))
    .filter((url) => !LOCAL_HOSTS.has(url.hostname))
    .map((url) => url.hostname);
  expect(externalHosts, 'the OCR route contacted a host that does not serve the app').toEqual([]);
});

test('disabled security and AI routes never mount a workflow', async ({ page }) => {
  for (const path of ['/tools/protect-pdf', '/tools/decrypt-pdf', '/tools/blackout-pdf', '/tools/ai-summarizer']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: /unavailable/i })).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  }
});

test('disabled routes load no quarantined tool code and contact no other host', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  for (const toolId of DISABLED_TOOL_IDS) {
    await page.goto(`/tools/${toolId}`);
  }

  // Signal 1: a disabled tool's own code-split chunk was fetched, which can only
  // happen if the gate stopped rendering the unavailable screen.
  const toolChunkRequests = requested.filter((requestUrl) => {
    const url = toUrl(requestUrl);
    return url !== null && DISABLED_TOOL_IDS.some((toolId) => matchesToolChunk(url.pathname, toolId));
  });
  expect(toolChunkRequests, 'a disabled route fetched its quarantined tool chunk').toEqual([]);

  // Signal 2: OCR worker/language assets or the PDF.js worker were loaded.
  const workerRequests = requested.filter((requestUrl) => matchesWorkerAsset(requestUrl));
  expect(workerRequests, 'a disabled route loaded OCR or PDF worker assets').toEqual([]);

  // Signal 3: any host other than the one serving the app. The assertion is zero
  // non-local hosts, not a list of known-bad ones, so a new egress host cannot be
  // waved through by being unfamiliar to this test.
  //
  // Every request a route makes has to resolve to the host that served the page. This
  // file used to allowlist `cdn.jsdelivr.net` and `unpkg.com` for a future OCR
  // enablement, and that pair turned a real hole into a passing test: only
  // Tesseract-shaped asset names were forbidden, so any other external fetch - a
  // font CDN, a telemetry collector, a pixel host - passed every check. Naming hosts
  // as acceptable is a silent policy change, so the list is gone. OCR is enabled and
  // self-hosted: its worker, WASM core and language data are served by the app origin
  // (e2e/ocr.spec.ts checks that on a real run), so there is still no host to add.
  // Widening this needs a deliberate CSP change and a new data boundary in
  // docs/privacy/data-flow.md.
  const externalHosts = [
    ...new Set(
      requested
        .map(toUrl)
        .filter((url): url is URL => url !== null && /^https?:$/.test(url.protocol))
        .filter((url) => !LOCAL_HOSTS.has(url.hostname))
        .map((url) => url.hostname + ' (' + url.pathname + ')'),
    ),
  ];
  expect(
    externalHosts,
    'a disabled route contacted a host that does not serve the app',
  ).toEqual([]);

  // Signal 4 (checked last so a broken gate is reported as a chunk regression
  // first): every disabled route still renders the unavailable screen.
  for (const toolId of DISABLED_TOOL_IDS) {
    await page.goto(`/tools/${toolId}`);
    await expect(page.getByRole('heading', { name: /unavailable/i })).toBeVisible();
  }
});

test('the redaction compatibility alias resolves to the quarantined route', async ({ page }) => {
  await page.goto('/tools/redact-pdf');
  await expect(page).toHaveURL(/\/tools\/blackout-pdf$/);
  await expect(page.getByRole('heading', { name: /unavailable/i })).toBeVisible();
});
