import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

/**
 * OCR end-to-end (roadmap A1.3). The production build is served from a single
 * origin, and this test runs a real OCR job on a raster-only page, so two
 * release-gate claims are checked instead of assumed:
 *
 *   1. the OCR pipeline (worker script, WASM core, language data) is fetched
 *      from the app origin only - no Tesseract CDN, no third-party host;
 *   2. the text layer the tool writes is extractable - pdf.js reads the
 *      downloaded file back and finds the recognized words.
 *
 * The fixture is generated in the browser instead of committed: a canvas with
 * text that is saved as a PNG and wrapped in a PDF. It carries no text layer,
 * so the tool has to recognize it (pages that already have text are skipped).
 */

const FIXTURE_TEXT = 'HELLO WORLD';
const FIXTURE_WIDTH = 1200;
const FIXTURE_HEIGHT = 400;
const FIXTURE_FONT_PX = 72;
/** Page size that makes the raster a ~150 DPI scan; the tool then renders it at 300 DPI. */
const FIXTURE_IMAGE_DPI = 150;

const toHttpUrl = (requestUrl: string): URL | null => {
  try {
    const url = new URL(requestUrl);
    return /^https?:$/.test(url.protocol) ? url : null;
  } catch {
    return null;
  }
};

/** Renders the fixture text to a PNG and wraps it in a one-page PDF with no text layer. */
async function createScannedPdf(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ({ text, width, height, fontSize }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D is unavailable, so the OCR fixture cannot be drawn.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#000000';
      context.font = `bold ${fontSize}px sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, width / 2, height / 2);
      return canvas.toDataURL('image/png');
    },
    { text: FIXTURE_TEXT, width: FIXTURE_WIDTH, height: FIXTURE_HEIGHT, fontSize: FIXTURE_FONT_PX },
  );

  const png = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(png);
  const pointsPerPixel = 72 / FIXTURE_IMAGE_DPI;
  const width = image.width * pointsPerPixel;
  const height = image.height * pointsPerPixel;
  pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
  return Buffer.from(await pdf.save());
}

/** Extracts the text layer from a PDF with pdf.js, the same parser the app ships. */
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // The text layer's glyphless font has no glyf table by design (src/lib/glyphlessFont.ts);
  // pdf.js warns about that while still reading the ToUnicode map, so silence the
  // warning and let the returned text decide whether extraction worked.
  const task = pdfjs.getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    const parts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const textContent = await (await pdf.getPage(pageNumber)).getTextContent();
      for (const item of textContent.items) {
        if ('str' in item) parts.push(item.str);
      }
    }
    return parts.join('');
  } finally {
    await task.destroy();
  }
}

test('a scanned page becomes a searchable PDF without leaving the app origin', async ({ page }) => {
  test.setTimeout(120_000);

  const scan = await createScannedPdf(page);

  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/tools/ocr-pdf');
  await expect(page.getByRole('heading', { name: /OCR PDF/i }).first()).toBeVisible();
  // A fresh browser profile shows the first-run onboarding tour, which overlays
  // the tool controls and would intercept the clicks below. Close it through its
  // own control; if a later change stops showing the tour, carry on without it.
  await page
    .getByRole('button', { name: 'Skip tour' })
    .first()
    .click({ timeout: 10_000 })
    .catch(() => undefined);
  await page.setInputFiles('input[type="file"]', {
    name: 'scan.pdf',
    mimeType: 'application/pdf',
    buffer: scan,
  });

  const recognize = page.getByRole('button', { name: 'Recognize text' });
  await expect(recognize).toBeVisible();
  await recognize.click();

  await expect(page.getByRole('heading', { name: 'OCR Complete!' })).toBeVisible({
    timeout: 90_000,
  });
  const summary = await page.getByText(/words added on/).innerText();
  const wordsAdded = Number(/(\d+) words added/.exec(summary)?.[1] ?? 0);
  expect(wordsAdded, `the tool reported no recognized words (summary: ${summary})`).toBeGreaterThan(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Searchable PDF' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath, 'the searchable PDF was not saved').not.toBeNull();
  const output = await readFile(downloadPath ?? '');

  // Every request the run made - the page's own assets and the ones the OCR
  // worker fetches for itself - has to go to the origin that served the app. The
  // scan, the engine and the language data therefore stay on this machine.
  const appOrigin = new URL(page.url()).origin;
  const requestedPaths = requests
    .map(toHttpUrl)
    .filter((url): url is URL => url !== null);
  const externalRequests = [
    ...new Set(
      requestedPaths
        .filter((url) => url.origin !== appOrigin)
        .map((url) => url.origin + url.pathname),
    ),
  ];
  expect(externalRequests, 'the OCR run contacted a host other than the app origin').toEqual([]);

  // Non-vacuous: the run really fetched the self-hosted worker, WASM core and
  // language data, so the assertion above covers the OCR pipeline and not just
  // the app shell.
  const assetPaths = requestedPaths.map((url) => url.pathname);
  expect(
    assetPaths.filter((path) => /\/worker\.min\.js$/.test(path)),
    'the OCR run did not load the self-hosted Tesseract worker script',
  ).not.toEqual([]);
  expect(
    assetPaths.filter((path) => /\/tesseract-core[^/]*\.wasm\.js$/.test(path)),
    'the OCR run did not load the self-hosted Tesseract WASM core',
  ).not.toEqual([]);
  expect(
    assetPaths.filter((path) => /\/[a-z]{3}\.traineddata\.gz$/.test(path)),
    'the OCR run did not load the self-hosted language data',
  ).not.toEqual([]);

  // The output keeps the original page image and adds an invisible text layer.
  // Extract it with pdf.js; a layer that cannot be read back is not searchable.
  const text = await extractPdfText(new Uint8Array(output));
  const normalized = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  for (const word of FIXTURE_TEXT.split(' ')) {
    expect(normalized, `the extracted text layer does not contain "${word}": "${text}"`).toContain(word);
  }
});
