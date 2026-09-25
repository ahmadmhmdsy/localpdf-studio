import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomeBento from './HomeBento';
import { TOOL_CATEGORIES } from '../../constants/tools';
import { TOOL_RELEASE_REGISTRY } from '../../config/featureRegistry';

function renderBento() {
  return render(
    <BrowserRouter>
      <HomeBento />
    </BrowserRouter>
  );
}

function recentChips() {
  return within(screen.getByLabelText('Recently used'));
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
});

describe('HomeBento availability messaging', () => {
  it('shows registry-derived availability without stale growth copy', () => {
    const { count, stateSummary } = getRegistrySummary();
    expect(count).not.toBe(31);
    renderBento();

    const heroTile = screen.getByRole('heading', { level: 1 }).closest('article') as HTMLElement;
    expect(heroTile).toHaveTextContent(`${count} tools, 7 categories`);
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

    const recent = recentChips();
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

    const recent = recentChips();
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

    const recent = recentChips();
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

    const recent = recentChips();
    const chip = recent.getByText(/^\s*Translate\b/i).closest('a, span');
    expect(chip).toBeTruthy();
    expect(chip!.tagName).toBe('A');
    expect(chip).toHaveAttribute('href', '/tools/translate-pdf');
    expect(chip!.textContent).not.toMatch(/unavailable/i);
  });

  it('states the privacy boundary in place, with no self-targeting privacy link', () => {
    renderBento();

    const privacyBlock = screen.getByRole('complementary', { name: 'Privacy guarantee' });
    expect(privacyBlock).toHaveAttribute('id', 'privacy');
    expect(privacyBlock).not.toHaveTextContent(/files never leave/i);
    expect(privacyBlock).toHaveTextContent(/AI, OCR, and camera tools are currently unavailable/i);

    // The note is the block itself, so a link to #privacy here would be a no-op jump.
    const selfTargetingLinks = within(privacyBlock)
      .queryAllByRole('link')
      .filter((link) => link.getAttribute('href') === '#privacy');
    expect(selfTargetingLinks).toEqual([]);
  });

  it('describes browser-local storage instead of claiming zero retained bytes', () => {
    renderBento();

    const privacyBlock = screen.getByRole('complementary', { name: 'Privacy guarantee' });

    // The old block rendered a large "0" next to "The number of bytes we keep of your
    // work." The editor really does persist the working document and the edit history
    // in IndexedDB, so that number was false and the byte framing had to go.
    expect(privacyBlock).not.toHaveTextContent(/bytes we keep/i);
    expect(privacyBlock.querySelector('.num')).toBeNull();

    // What the code actually does: process in the browser, keep a copy in this
    // browser's local storage, and stay there until the reader clears it.
    expect(privacyBlock).toHaveTextContent(/where your work is stored/i);
    expect(privacyBlock).toHaveTextContent(/local storage/i);
    expect(privacyBlock).toHaveTextContent(/until you clear it/i);
    expect(privacyBlock).toHaveTextContent(/clear the stored data for this site/i);

    // The containment sentence stays.
    expect(privacyBlock).toHaveTextContent(/AI, OCR, and camera tools are currently unavailable/i);
  });

  it('preserves link behavior for available recent chips (Merge, Sign)', () => {
    renderBento();
    const recent = recentChips();
    expect(recent.getByRole('link', { name: /Merge —/ })).toHaveAttribute('href', '/tools/merge-pdf');
    expect(recent.getByRole('link', { name: /Sign —/ })).toHaveAttribute('href', '/tools/sign-pdf');
  });
});
