import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The shell re-renders from a hydrated store, so let animations settle the same
// way the a11y spec does.
test.use({ reducedMotion: 'reduce' });

test('switches the shell to Arabic, mirrors the layout, and remembers the choice', async ({ page }) => {
  // The first-run tour is a modal; it would intercept the header clicks. The
  // tour itself is not part of this slice (B1.4 localises it).
  await page.addInitScript(() => {
    window.localStorage.setItem('pdf_studio_onboarded', 'true');
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(html).toHaveAttribute('dir', 'ltr');

  await page.getByRole('button', { name: 'Change language' }).click();

  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('link', { name: 'كل أدوات PDF' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'المحرر المرئي' })).toBeVisible();

  // A mirrored layout must not introduce horizontal scrolling.
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

  const results = await new AxeBuilder({ page }).analyze();
  for (const item of results.incomplete) {
    console.log(`[i18n a11y] incomplete(${item.id}): ${item.nodes.length} node(s)`);
  }
  expect(results.violations).toEqual([]);

  // The choice lives in the persisted preferences, so a reload keeps Arabic.
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('link', { name: 'كل أدوات PDF' })).toBeVisible();
});
