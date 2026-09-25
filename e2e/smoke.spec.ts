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
