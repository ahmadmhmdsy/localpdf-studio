import { expect, test, type Locator, type Page } from '@playwright/test';
import { PDFDocument, rgb } from 'pdf-lib';

const SKINS = ['glass', 'bento'] as const;
type Skin = (typeof SKINS)[number];

const DESKTOP = { width: 1440, height: 900 };
// Narrowest width the desktop layout must hold, where the bento rail and the
// editor panels leave the toolbar the least room.
const SMALL_DESKTOP = { width: 1280, height: 800 };

test.use({ reducedMotion: 'reduce' });

// Same seeding as the a11y spec: the app reads these from IndexedDB on boot.
async function seedPreferences(
  page: Page,
  skin: Skin,
  { darkMode = false, locale = 'en' }: { darkMode?: boolean; locale?: 'en' | 'ar' } = {},
): Promise<void> {
  await page.addInitScript(
    (prefs: { skin: Skin; darkMode: boolean; locale: string }) => {
      window.localStorage.setItem('pdf_studio_onboarded', 'true');
      const request = indexedDB.open('keyval-store', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('keyval')) db.createObjectStore('keyval');
      };
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('keyval')) return;
        db.transaction('keyval', 'readwrite').objectStore('keyval').put(prefs, 'ui-preferences');
      };
    },
    { skin, darkMode, locale },
  );
}

async function open(page: Page, path: string, skin: Skin): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('html')).toHaveAttribute('data-skin', skin);
}

const box = async (locator: Locator) => {
  const value = await locator.boundingBox();
  if (!value) throw new Error('element has no layout box');
  return value;
};

async function samplePdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  page.drawRectangle({ x: 72, y: 600, width: 200, height: 100, color: rgb(1, 1, 1) });
  return Buffer.from(await pdf.save());
}

async function openEditor(page: Page, skin: Skin): Promise<void> {
  await open(page, '/editor', skin);
  await page.setInputFiles('input[type="file"]', {
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    buffer: await samplePdf(),
  });
  await expect(page.locator('canvas').first()).toBeVisible();
}

test('the glass header sits above the page content', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await seedPreferences(page, 'glass');

  for (const path of ['/', '/tools/merge-pdf', '/limitations']) {
    await open(page, path, 'glass');
    const header = await box(page.locator('header').first());
    const heading = await box(page.locator('main h1').first());
    expect(heading.y, path).toBeGreaterThanOrEqual(header.y + header.height);
  }
});

test('the glass editor toolbar sits below the header', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await seedPreferences(page, 'glass');
  await openEditor(page, 'glass');

  const header = await box(page.locator('header').first());
  const toolbar = await box(page.getByRole('button', { name: 'Export Page' }));
  expect(toolbar.y).toBeGreaterThanOrEqual(header.y + header.height);
  const footer = await box(page.locator('footer').first());
  expect(footer.y).toBeLessThanOrEqual(DESKTOP.height);
});

for (const skin of SKINS) {
  for (const locale of ['en', 'ar'] as const) {
    test(`keeps the release badge in the card corner in ${skin} (${locale})`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await seedPreferences(page, skin, { locale });
      await open(page, '/', skin);

      const badge = page.locator('span.absolute[aria-label]').first();
      await badge.scrollIntoViewIfNeeded();
      const card = badge.locator("xpath=ancestor::*[self::a or contains(@class, 'bento-tool')][1]");
      const badgeBox = await box(badge);
      const cardBox = await box(card);

      expect(badgeBox.y).toBeGreaterThanOrEqual(cardBox.y);
      expect(badgeBox.y + badgeBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height / 2);
      expect(badgeBox.x).toBeGreaterThanOrEqual(cardBox.x);
      expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
      const middle = cardBox.x + cardBox.width / 2;
      if (locale === 'ar') expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(middle);
      else expect(badgeBox.x).toBeGreaterThanOrEqual(middle);
    });
  }

  for (const viewport of [DESKTOP, SMALL_DESKTOP]) {
    test(`shows both export buttons in ${skin} at ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedPreferences(page, skin);
      await openEditor(page, skin);

      for (const name of ['Export Page', 'Export All']) {
        const button = page.getByRole('button', { name });
        await expect(button).toBeVisible();
        const { x, width } = await box(button);
        expect(x + width, name).toBeLessThanOrEqual(viewport.width);
        const clipped = await button.evaluate((element) => element.scrollWidth > element.clientWidth);
        expect(clipped, name).toBe(false);
      }
    });
  }

  test(`keeps the PDF page in its own colors in dark mode (${skin})`, async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await seedPreferences(page, skin, { darkMode: true });
    await openEditor(page, skin);

    const filter = await page.locator('canvas').first().evaluate((node) => getComputedStyle(node).filter);
    expect(filter).toBe('none');
  });
}
