import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PATHS = ['/', '/tools/merge-pdf', '/tools/protect-pdf'];
const THEMES = ['light', 'dark'] as const;

// axe has to scan a settled page. The home cards animate in from opacity 0 and
// Layout applies data-theme from a store that hydrates asynchronously, so a scan
// started at 'load' can read mid-animation colours and miss real failures.
// src/index.css already honours prefers-reduced-motion, so no sleeps are needed.
test.use({ reducedMotion: 'reduce' });

// The theme is persisted in IndexedDB (`ui-preferences` via idb-keyval) and the
// app hydrates it on boot. Seed that value instead of forcing the attribute
// afterwards: a late store hydration used to rewrite `data-theme` in the middle
// of an axe scan, so the contrast rule could read the background in one theme
// and the text colour in the other. Seeding makes the app apply the theme
// itself, so there is nothing left to fight the test.
async function seedTheme(page: Page, isDark: boolean): Promise<void> {
  await page.addInitScript((dark: boolean) => {
    const request = indexedDB.open('keyval-store', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keyval')) db.createObjectStore('keyval');
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keyval')) return;
      db.transaction('keyval', 'readwrite')
        .objectStore('keyval')
        .put({ darkMode: dark }, 'ui-preferences');
    };
  }, isDark);
}

for (const theme of THEMES) {
  for (const path of PATHS) {
    test(`has no automatically detectable violations at ${path} (${theme} theme)`, async ({ page }) => {
      await seedTheme(page, theme === 'dark');
      await page.goto(path);

      // The app applies the seeded theme once its store hydrates; wait for that
      // and fail if it settles anywhere else before measuring.
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      const results = await new AxeBuilder({ page }).analyze();

      // Report what axe could not decide (translucent backdrops, opacity dimming,
      // gradient text) instead of hiding it by narrowing the rule set.
      for (const item of results.incomplete) {
        console.log(
          `[a11y] incomplete(${item.id}) ${path} ${theme}: ${item.nodes.length} node(s) -> ` +
            item.nodes.map((node) => node.target.join(' ')).join(', '),
        );
      }

      expect(results.violations).toEqual([]);
    });
  }
}
