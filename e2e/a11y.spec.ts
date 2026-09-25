import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PATHS = ['/', '/tools/merge-pdf', '/tools/protect-pdf'];
const THEMES = ['light', 'dark'] as const;

// axe has to scan a settled page. The home cards animate in from opacity 0 and
// Layout applies data-theme from a store that hydrates asynchronously, so a scan
// started at 'load' can read mid-animation colours and miss real failures.
// src/index.css already honours prefers-reduced-motion, so no sleeps are needed.
test.use({ reducedMotion: 'reduce' });

for (const theme of THEMES) {
  for (const path of PATHS) {
    test(`has no automatically detectable violations at ${path} (${theme} theme)`, async ({ page }) => {
      await page.goto(path);

      // Hydration can rewrite data-theme after load, so wait it out, then force
      // the theme and assert it stuck before measuring.
      await page.waitForLoadState('networkidle');
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
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
