import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomeBento from './HomeBento';
import { TOOL_CATEGORIES } from '../../constants/tools';
import { TOOL_RELEASE_REGISTRY } from '../../config/featureRegistry';
import { useToolsStore } from '../../store/toolsStore';

function renderBento() {
  return render(
    <BrowserRouter>
      <HomeBento />
    </BrowserRouter>
  );
}

function quickPicks() {
  return within(screen.getByLabelText('Example tools to try'));
}

const ALL_TOOLS = TOOL_CATEGORIES.flatMap((category) => category.tools);

function getRegistrySummary() {
  const entries = ALL_TOOLS.map((tool) => TOOL_RELEASE_REGISTRY[tool.id]);
  const available = entries.filter((entry) => entry.releaseState !== 'disabled');
  const stateSummary = (['stable', 'limited', 'experimental'] as const)
    .map((state) => ({ state, count: available.filter((entry) => entry.releaseState === state).length }))
    .filter(({ count }) => count > 0)
    .map(({ state, count }) => `${count} ${state}`)
    .join(' · ');

  return { count: available.length, stateSummary };
}

const pristineCompress = TOOL_RELEASE_REGISTRY['compress-pdf'];
const pristineTranslate = TOOL_RELEASE_REGISTRY['translate-pdf'];

afterEach(() => {
  TOOL_RELEASE_REGISTRY['compress-pdf'] = pristineCompress;
  TOOL_RELEASE_REGISTRY['translate-pdf'] = pristineTranslate;
  useToolsStore.setState({ locale: 'en' });
});

describe('HomeBento availability messaging', () => {
  it('shows registry-derived availability without stale growth copy', () => {
    const { count, stateSummary } = getRegistrySummary();
    expect(count).not.toBe(31);
    renderBento();

    const heroTile = screen.getByRole('heading', { level: 1 }).closest('article') as HTMLElement;
    expect(heroTile).toHaveTextContent(`${count} tools across ${TOOL_CATEGORIES.length} categories`);
    const search = screen.getByPlaceholderText(new RegExp(`^Search ${count} tools`));
    expect(search).toBeInTheDocument();
    expect(search.getAttribute('placeholder')).not.toMatch(/redact/i);

    const countLabel = screen.getByText('Tools available');
    const tile = countLabel.closest('article') as HTMLElement;
    expect(tile).toHaveTextContent(String(count));
    expect(tile).toHaveTextContent(stateSummary);
    expect(tile).not.toHaveTextContent(/▲|this month/i);
  });

  it('does not link the alternate Home skin to the editor redaction query', () => {
    renderBento();

    expect(
      screen.getAllByRole('link').some((link) => link.getAttribute('href')?.includes('redact-pdf')),
    ).toBe(false);
  });

  it('includes the registry state in a limited tool link accessible name', () => {
    renderBento();

    const limitedLink = screen.getByRole('link', {
      name: (accessibleName) =>
        /repair pdf/i.test(accessibleName) && /limited/i.test(accessibleName),
    });
    expect(limitedLink).toHaveAttribute('href', '/tools/repair-pdf');
  });

  it('names the non-interactive unavailable card with its registry state', () => {
    renderBento();

    const unavailableCard = screen.getByRole('group', {
      name: (accessibleName) =>
        /compress pdf/i.test(accessibleName) && /unavailable/i.test(accessibleName),
    });
    expect(unavailableCard).toHaveAttribute('aria-disabled', 'true');
    expect(unavailableCard.tagName).toBe('DIV');
    expect(within(unavailableCard).getByLabelText('Unavailable').closest('[style*="opacity"]')).toBeNull();
  });

  it('uses theme-specific WCAG AA foregrounds for availability badges', () => {
    renderBento();

    for (const badge of screen.getAllByLabelText('Limited')) {
      expect(badge).toHaveClass('text-amber-800', 'dark:text-amber-300');
    }
    for (const badge of screen.getAllByLabelText('Unavailable')) {
      expect(badge).toHaveClass('text-red-700', 'dark:text-red-300');
    }
  });

  it('recomputes the hero metrics when registry availability changes', () => {
    const before = getRegistrySummary().count;
    TOOL_RELEASE_REGISTRY['compress-pdf'] = {
      ...pristineCompress,
      releaseState: 'stable',
    };
    const after = getRegistrySummary();
    expect(after.count).toBe(before + 1);

    renderBento();

    const tile = screen.getByText('Tools available').closest('article') as HTMLElement;
    expect(tile).toHaveTextContent(String(after.count));
    expect(tile).toHaveTextContent(after.stateSummary);
  });

  it('renders the Compress recent chip from the registry (linked when available)', () => {
    // Make compress remediated so the chip state cannot be hardcoded: if the
    // component derives state from the registry, the chip becomes a live link.
    TOOL_RELEASE_REGISTRY['compress-pdf'] = {
      ...pristineCompress,
      releaseState: 'limited',
    };
    renderBento();

    const recent = quickPicks();
    const chip = recent.getByText(/^\s*Compress\b/i).closest('a, span');
    expect(chip).toBeTruthy();
    expect(chip!.tagName).toBe('A');
    expect(chip).toHaveAttribute('href', '/tools/compress-pdf');
    expect(chip!.textContent).not.toMatch(/unavailable/i);
  });

  it('renders a disabled Compress chip as a non-interactive element', () => {
    TOOL_RELEASE_REGISTRY['compress-pdf'] = {
      ...pristineCompress,
      releaseState: 'disabled',
    };
    renderBento();

    const recent = quickPicks();
    const chip = recent.getByText(/^\s*Compress\b/i).closest('a, span');
    expect(chip).toBeTruthy();
    expect(chip!.tagName).toBe('SPAN');
    expect(chip).toHaveAttribute('aria-disabled', 'true');
    expect(chip).not.toHaveStyle({ opacity: '0.55' });
  });

  it('renders a disabled Translate chip as a non-interactive element from the registry', () => {
    TOOL_RELEASE_REGISTRY['translate-pdf'] = {
      ...pristineTranslate,
      releaseState: 'disabled',
    };
    renderBento();

    const recent = quickPicks();
    const chip = recent.getByText(/^\s*Translate\b/i).closest('a, span');
    expect(chip).toBeTruthy();
    expect(chip!.tagName).toBe('SPAN');
    expect(chip).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders a remediated Translate recent chip as a link from the registry', () => {
    TOOL_RELEASE_REGISTRY['translate-pdf'] = {
      ...pristineTranslate,
      releaseState: 'stable',
    };
    renderBento();

    const recent = quickPicks();
    const chip = recent.getByText(/^\s*Translate\b/i).closest('a, span');
    expect(chip).toBeTruthy();
    expect(chip!.tagName).toBe('A');
    expect(chip).toHaveAttribute('href', '/tools/translate-pdf');
    expect(chip!.textContent).not.toMatch(/unavailable/i);
  });

  it('states the privacy boundary in place, with no self-targeting privacy link', () => {
    renderBento();

    const privacyBlock = screen.getByRole('complementary', { name: 'Data handling' });
    expect(privacyBlock).toHaveAttribute('id', 'privacy');
    expect(privacyBlock).not.toHaveTextContent(/files never leave/i);
    expect(privacyBlock).toHaveTextContent(/AI and camera tools are currently unavailable/i);

    // The note is the block itself, so a link to #privacy here would be a no-op jump.
    const selfTargetingLinks = within(privacyBlock)
      .queryAllByRole('link')
      .filter((link) => link.getAttribute('href') === '#privacy');
    expect(selfTargetingLinks).toEqual([]);
  });

  it('describes browser-local storage instead of claiming zero retained bytes', () => {
    renderBento();

    const privacyBlock = screen.getByRole('complementary', { name: 'Data handling' });

    // The old block rendered a large "0" next to "The number of bytes we keep of your
    // work." The editor really does persist the working document and the edit history
    // in IndexedDB, so that number was false and the byte framing had to go.
    expect(privacyBlock).not.toHaveTextContent(/bytes we keep/i);
    expect(privacyBlock.querySelector('.num')).toBeNull();

    // What the code actually does: process locally, keep a copy in this app's local
    // storage on this device, and stay there until the reader clears it. The wording
    // has to hold in the Tauri build too, where the surface is a WebView, not a browser.
    expect(privacyBlock).toHaveTextContent(/where your work is stored/i);
    expect(privacyBlock).toHaveTextContent(/local storage/i);
    expect(privacyBlock).toHaveTextContent(/on this device/i);
    expect(privacyBlock).toHaveTextContent(/until you clear it/i);
    expect(privacyBlock).toHaveTextContent(/clear this app's stored data/i);
    expect(privacyBlock).not.toHaveTextContent(/in your browser/i);

    // The containment sentence stays.
    expect(privacyBlock).toHaveTextContent(/AI and camera tools are currently unavailable/i);
  });

  it('preserves link behavior for available quick-pick chips (Merge, Sign)', () => {
    renderBento();
    const recent = quickPicks();
    expect(recent.getByRole('link', { name: /Merge —/ })).toHaveAttribute('href', '/tools/merge-pdf');
    expect(recent.getByRole('link', { name: /Sign —/ })).toHaveAttribute('href', '/tools/sign-pdf');
  });

  it('derives the egress counter from the registry instead of asserting a measured zero', () => {
    renderBento();

    const networked = ALL_TOOLS.filter((tool) => TOOL_RELEASE_REGISTRY[tool.id].privacy !== 'local-only');
    const available = networked.filter(
      (tool) => TOOL_RELEASE_REGISTRY[tool.id].releaseState !== 'disabled',
    );
    // Non-vacuous: the registry really does classify network and camera tools.
    expect(networked.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['ai-summarizer', 'translate-pdf', 'scan-to-pdf']),
    );

    const tile = screen.getByText('Tools that can send data out').closest('article') as HTMLElement;
    expect(tile).toHaveTextContent(String(available.length));
    expect(tile).toHaveTextContent(
      available.length === 0 ? /none available in this build/i : /of \d+ enabled/i,
    );
    // The old tile claimed a measured byte count that nothing measures.
    expect(tile).not.toHaveTextContent(/bytes uploaded|always zero/i);
  });

  it('ships no absolute data-handling claim in its rendered claim surfaces', () => {
    const { container } = renderBento();
    // The tiles and the data-handling block are the copy that makes claims. The tool
    // catalog below them is registry data, and a disabled tool keeps its own wording
    // (OCR PDF says "on-device OCR"), which is a description, not a promise.
    const claimText = [
      container.querySelector('.bento-featured')?.textContent ?? '',
      container.querySelector('.bento-privacy-deep')?.textContent ?? '',
      container.querySelector('.bento-recent')?.textContent ?? '',
    ].join(' ');

    expect(claimText.length).toBeGreaterThan(0);
    for (const pattern of [
      /on-device/i,
      /zero servers/i,
      /nothing persists/i,
      /always zero/i,
      /tracking pixels/i,
      /nothing phones home/i,
      /privacy guarantee/i,
      /recently used/i,
    ]) {
      expect(claimText, `rendered home claim matched ${pattern}`).not.toMatch(pattern);
    }

    // The containment and retention statements are the ones that must survive.
    expect(claimText).toMatch(/AI and camera tools are unavailable in the public beta/i);
    expect(claimText).toMatch(/local storage/i);
  });

  it('renders the catalog cards and category headings in the active locale', () => {
    useToolsStore.setState({ locale: 'ar' });
    renderBento();

    expect(screen.getByText('دمج PDF')).toBeInTheDocument();
    // Category heading and the Organize card share the same Arabic name.
    expect(screen.getAllByText('تنظيم PDF').length).toBeGreaterThan(0);
    expect(screen.queryByText('Merge PDF')).not.toBeInTheDocument();

    // The chrome follows the locale too: search, status badges and the privacy block.
    expect(screen.getByPlaceholderText(/^ابحث في \d+ أداة/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('غير متاح').length).toBeGreaterThan(0);
    const privacyBlock = screen.getByRole('complementary', { name: 'التعامل مع البيانات' });
    expect(privacyBlock).toHaveTextContent(/التخزين المحلي/);
    expect(privacyBlock).not.toHaveTextContent(/local storage/i);
  });

  it('presents the sample strip as examples, not as a record of the reader\'s work', () => {
    renderBento();

    const strip = screen.getByLabelText('Example tools to try');
    expect(strip).toHaveAttribute('id', 'quick-picks');
    expect(screen.getByText('Quick picks')).toBeInTheDocument();
    // The chips advertise what a tool does; they are not invented documents.
    expect(strip.textContent).not.toMatch(/Q3|investor|proposal|paper notes|asset brief/i);
  });
});
