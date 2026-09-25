import { expect, test } from '@playwright/test';
import { TOOL_RELEASE_REGISTRY, type ToolId } from '../src/config/featureRegistry';

type RegistryEntry = [ToolId, (typeof TOOL_RELEASE_REGISTRY)[ToolId]];

/**
 * Every tool the registry marks `disabled`, read from the registry itself so a new
 * quarantined tool is covered here automatically. The list is asserted non-empty and
 * checked for the containment-sensitive tools in the first test, so an emptied or
 * narrowed registry cannot make the assertions below vacuous.
 */
const DISABLED_TOOL_IDS: ToolId[] = (Object.entries(TOOL_RELEASE_REGISTRY) as RegistryEntry[])
  .filter(([, availability]) => availability.releaseState === 'disabled')
  .map(([toolId]) => toolId);

/**
 * The hosts a quarantined workflow could legitimately need: the CDNs a Tesseract
 * worker would fetch its core, worker, and language data from. They stay allowed
 * because a future OCR enablement needs them, and the OCR/CDN asset matcher above
 * still forbids them from being fetched while OCR is disabled.
 *
 * No other external host is allowed, and in particular no font host: the app ships
 * no third-party font, so `fonts.googleapis.com` and `fonts.gstatic.com` are now
 * unlisted hosts that fail the assertion below if they ever reappear. Anything else
 * is a containment failure, so the assertion is an allowlist rather than a list of
 * known-bad hosts.
 */
const ALLOWED_EXTERNAL_HOSTS = new Set(['cdn.jsdelivr.net', 'unpkg.com']);

/**
 * Font hosts the shipped app must never contact. The app uses system font stacks
 * only, so any request here is third-party egress on every page view and a privacy
 * regression.
 */
const FORBIDDEN_FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

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
    'ocr-pdf',
    'scan-to-pdf',
    'protect-pdf',
    'decrypt-pdf',
    'blackout-pdf',
  ] satisfies ToolId[]) {
    expect(DISABLED_TOOL_IDS, toolId).toContain(toolId);
  }
});

test('disabled security and AI routes never mount a workflow', async ({ page }) => {
  for (const path of ['/tools/protect-pdf', '/tools/decrypt-pdf', '/tools/blackout-pdf', '/tools/ai-summarizer', '/tools/ocr-pdf']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: /unavailable/i })).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  }
});

test('disabled routes load no quarantined tool code and reach no unlisted host', async ({ page }) => {
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

  // Signal 3: any host outside the explicit allowlist, so a new egress host is
  // visible even when it is not one of the services this test already knew about.
  const unlistedHosts = [
    ...new Set(
      requested
        .map(toUrl)
        .filter((url): url is URL => url !== null && /^https?:$/.test(url.protocol))
        .filter((url) => !LOCAL_HOSTS.has(url.hostname) && !ALLOWED_EXTERNAL_HOSTS.has(url.hostname))
        .map((url) => url.hostname),
    ),
  ];
  expect(unlistedHosts, 'a disabled route contacted a host outside the allowlist').toEqual([]);

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
