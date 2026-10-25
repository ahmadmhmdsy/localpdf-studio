import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Settings } from 'lucide-react';
import { TOOL_CATEGORIES, Tool } from '../../constants/tools';
import {
  getToolAvailability,
  isToolAvailable,
  type ReleaseState,
  type ToolId,
} from '../../config/featureRegistry';
import { useToolsStore } from '../../store/toolsStore';
import { useI18n } from '../../i18n/useI18n';
import { releaseStateBadgeKey, releaseStateSummaryKey } from '../../i18n/releaseState';
import { cn } from '../../lib/utils';

const ALL_TOOLS = TOOL_CATEGORIES.flatMap((category) => category.tools);

/**
 * Home page rendered when the user picks the "bento" skin. Sidebar nav is
 * handled by `Sidebar.tsx` in `Layout.tsx`; this component is the main column.
 *
 * Visual differences from the default (`Home.tsx`) glass variant:
 * - Compact topbar with search + actions instead of a hero block.
 * - Featured bento tiles (2fr 1fr 1fr) above the categories.
 * - Tighter card grid with 14px radius and no oversized hover.
 * - Dark "privacy deep" block at the bottom.
 */
export default function HomeBento() {
  const [query, setQuery] = useState('');
  const darkMode = useToolsStore((s) => s.darkMode);
  const toggleDarkMode = useToolsStore((s) => s.toggleDarkMode);
  const { t, tool: toolCopy, categoryName } = useI18n();

  // Derived from the release registry so availability changes keep Home truthful.
  const availabilitySummary = useMemo(() => {
    const availableStates = ALL_TOOLS.map((tool) => getToolAvailability(tool.id)).filter(
      (availability) => availability.releaseState !== 'disabled'
    );
    // Counts only. Wording ("6 stable") is rendered from the locale catalogs so the
    // summary translates with the rest of the page.
    const states = (['stable', 'limited', 'experimental'] as const)
      .map((state) => ({
        state,
        count: availableStates.filter((availability) => availability.releaseState === state).length,
      }))
      .filter(({ count }) => count > 0);

    return { count: availableStates.length, states };
  }, []);

  // How many *available* tools can move data off the device. Every network and camera
  // tool is disabled in the registry, so this reads 0 in the web beta and in the
  // desktop build alike, and it turns non-zero the moment one of them is enabled -
  // which is exactly when the sentence under it has to change.
  const egressSummary = useMemo(() => {
    const networked = ALL_TOOLS.filter((tool) => getToolAvailability(tool.id).privacy !== 'local-only');
    return {
      networked: networked.length,
      available: networked.filter((tool) => isToolAvailable(tool.id)).length,
    };
  }, []);

  // Filter tools across all categories by name + description (case-insensitive),
  // using the active locale's copy so search works in every language.
  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOL_CATEGORIES;
    return TOOL_CATEGORIES
      .map((c) => ({
        ...c,
        tools: c.tools.filter((t) => {
          const copy = toolCopy(t.id);
          const hay = `${copy.name} ${copy.description}`.toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((c) => c.tools.length > 0);
  }, [query, toolCopy]);

  return (
    <>
      {/* Topbar */}
      <div className="bento-topbar">
        <div className="bento-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            placeholder={t('home.bento.search.placeholder', { count: availabilitySummary.count })}
            aria-label={t('home.bento.search.label')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="bento-actions">
          <button
            type="button"
            className="bento-icon-btn"
            aria-label={darkMode ? t('shell.theme.toLight') : t('shell.theme.toDark')}
            onClick={toggleDarkMode}
            title={t('home.bento.theme.toggle')}
          >
            {darkMode ? '☀' : '☾'}
          </button>
          <button
            type="button"
            className="bento-icon-btn"
            aria-label={t('home.bento.settings')}
            title={t('home.bento.settings')}
          >
            <Settings size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Featured bento tiles */}
      <section className="bento-featured" aria-label={t('home.bento.featured')}>
        <article className="bento-tile bento-tile--hero">
          <span className="bento-privacy-badge">
            <span className="dot" /> {t('home.bento.localFirst')}
          </span>
          <h1>
            {t('home.bento.hero.titleLead')} <span>{t('home.bento.hero.titleEmphasis')}</span>{' '}
            {t('home.bento.hero.titleRest')}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '1rem', maxWidth: '30em', marginBottom: '1.5rem' }}>
            {t('home.bento.hero.summary', {
              count: availabilitySummary.count,
              categories: TOOL_CATEGORIES.length,
            })}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/tools/merge-pdf" className="btn btn--pri">
              {t('home.bento.hero.startMerging')}
            </Link>
            <Link to="/editor" className="btn btn--ghost">
              {t('home.bento.hero.openEditor')}
            </Link>
          </div>
        </article>

        <article className="bento-tile" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {availabilitySummary.count}
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', fontFamily: 'ui-monospace, "JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.5rem' }}>
            {t('home.bento.toolsAvailable')}
          </div>
          <div style={{ fontFamily: 'ui-monospace, "JetBrains Mono", monospace', fontSize: '0.7rem', color: 'var(--ok)', marginTop: '0.4rem' }}>
            {availabilitySummary.states.length === 0
              ? t('home.bento.noToolsAvailable')
              : availabilitySummary.states
                  .map(({ state, count }) =>
                    t('home.bento.state.item', {
                      count,
                      state: t(releaseStateSummaryKey(state)),
                    }),
                  )
                  .join(' · ')}
          </div>
        </article>

        <article className="bento-tile" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {egressSummary.available}
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', fontFamily: 'ui-monospace, "JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.5rem' }}>
            {t('home.bento.egress.label')}
          </div>
          <div style={{ fontFamily: 'ui-monospace, "JetBrains Mono", monospace', fontSize: '0.7rem', color: 'var(--ok)', marginTop: '0.4rem' }}>
            {egressSummary.available === 0
              ? t('home.bento.egress.none')
              : t('home.bento.egress.enabled', {
                  available: egressSummary.available,
                  total: egressSummary.networked,
                })}
          </div>
        </article>

        <article className="bento-tile" style={{ padding: '1.25rem' }}>
          <span className="bento-privacy-badge">
            <span className="dot" /> {t('home.bento.noAccount.badge')}
          </span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>{t('home.bento.noAccount.title')}</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
            {t('home.bento.noAccount.body')}
          </p>
        </article>
      </section>

      {/* Quick picks: a static example list, not a record of anything the reader did. */}
      <div className="bento-recent" id="quick-picks" aria-label={t('home.bento.quickPicks.examples')}>
        <span className="label">{t('home.bento.quickPicks.label')}</span>
        <div className="items">
          <Link to="/tools/merge-pdf" className="bento-chip">
            <span className="ic-s" /> {t('home.bento.chip.merge')}
          </Link>
          <QuickChip
            toolId="compress-pdf"
            swatch="var(--accent-2)"
            context={t('home.bento.chip.compress')}
          />
          <Link to="/tools/sign-pdf" className="bento-chip">
            <span className="ic-s" style={{ background: 'var(--accent-4)' }} />{' '}
            {t('home.bento.chip.sign')}
          </Link>
          <QuickChip
            toolId="translate-pdf"
            swatch="var(--accent-3)"
            context={t('home.bento.chip.translate')}
          />
        </div>
      </div>

      {/* Category grids */}
      {filteredCategories.length === 0 ? (
        <div
          style={{
            padding: '3rem 1rem',
            textAlign: 'center',
            color: 'var(--text-3)',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
            {t('home.bento.empty.title', { query })}
          </h3>
          <p style={{ fontSize: '0.88rem' }}>{t('home.bento.empty.body')}</p>
        </div>
      ) : (
        filteredCategories.map((category) => (
          <section key={category.id} aria-label={categoryName(category.id)}>
            <div className="bento-sec">
              <h2>
                <span
                  className="cat-dot"
                  style={{
                    background: category.tools[0]?.color?.includes('red')
                      ? '#ef4444'
                      : category.tools[0]?.color?.includes('green')
                      ? '#10b981'
                      : category.tools[0]?.color?.includes('yellow')
                      ? '#f59e0b'
                      : category.tools[0]?.color?.includes('blue')
                      ? '#3b82f6'
                      : category.tools[0]?.color?.includes('purple')
                      ? '#8b5cf6'
                      : category.tools[0]?.color?.includes('pink')
                      ? '#ec4899'
                      : 'var(--accent)',
                  }}
                />
                {categoryName(category.id)}
              </h2>
              <span className="meta">
                {t('home.bento.category.count', { count: category.tools.length })}
              </span>
            </div>
            <div className="bento-grid">
              {category.tools.map((tool) => (
                <BentoToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Privacy deep block */}
      <aside className="bento-privacy-deep" id="privacy" aria-label={t('home.bento.privacy.label')}>
        <div>
          <h3>{t('home.bento.privacy.title')}</h3>
          <p>{t('home.bento.privacy.body')}</p>
        </div>
      </aside>
    </>
  );
}

function BentoToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const availability = getToolAvailability(tool.id);
  const unavailable = !isToolAvailable(tool.id);
  const targetPath = tool.isMVP ? `/tools/${tool.id}` : '#';
  const { t, tool: toolCopy } = useI18n();
  const copy = toolCopy(tool.id);
  const badgeKey = releaseStateBadgeKey(availability.releaseState);
  const stateLabel = badgeKey ? t(badgeKey) : null;
  const accessibleLabel = stateLabel
    ? `${copy.name} — ${copy.description} — ${stateLabel}`
    : `${copy.name} — ${copy.description}`;

  if (unavailable) {
    // Unavailable tools must not activate a workflow from Home.
    return (
      <div
        className="bento-tool relative"
        role="group"
        aria-label={accessibleLabel}
        aria-disabled="true"
      >
        <CardIcon icon={Icon} dimmed />
        <div className="name" style={{ opacity: 0.55 }}>{copy.name}</div>
        <div className="desc" style={{ opacity: 0.55 }}>{copy.description}</div>
        <StatusBadge releaseState={availability.releaseState} />
      </div>
    );
  }

  return (
    <Link
      to={targetPath}
      className="bento-tool relative"
      aria-label={accessibleLabel}
      aria-disabled={!tool.isMVP ? true : undefined}
    >
      <CardIcon icon={Icon} />
      <div className="name">{copy.name}</div>
      <div className="desc">{copy.description}</div>
      <StatusBadge releaseState={availability.releaseState} />
    </Link>
  );
}

function CardIcon({ icon: Icon, dimmed = false }: { icon: Tool['icon']; dimmed?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md text-white',
        'bg-[var(--bg-2)]'
      )}
      style={dimmed
        ? { background: 'var(--bg-2)', opacity: 0.55 }
        : { background: 'var(--bg-2)' }}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
    </div>
  );
}

// An example chip in the quick-picks strip. It is not a history entry: nothing here
// comes from what the reader opened. Its state is still read from the release
// registry, so a remediation cannot leave a stale "unavailable" label behind.
// Disabled tools stay non-interactive; anything available keeps its normal link
// behavior.
function QuickChip({
  toolId,
  swatch,
  context,
}: {
  toolId: ToolId;
  swatch: string;
  context: string;
}) {
  const availability = getToolAvailability(toolId);
  const unavailable = !isToolAvailable(toolId);
  const { t, tool: toolCopy } = useI18n();
  // Strip the trailing "PDF" so the chip reads "Merge — combine files".
  const shortName = toolCopy(toolId).name.replace(/\s+PDF$/i, '');

  if (unavailable) {
    return (
      <span
        className="bento-chip"
        aria-disabled="true"
        style={{ color: 'var(--text-2)', textDecoration: 'line-through' }}
      >
        <span className="ic-s" style={{ background: swatch }} />{' '}
        {t('home.bento.chip.unavailable', { name: shortName })}
      </span>
    );
  }

  const stateSuffix =
    availability.releaseState === 'stable' || availability.releaseState === 'disabled'
      ? ''
      : t('home.bento.chip.stateSuffix', {
          state: t(releaseStateSummaryKey(availability.releaseState)),
        });
  return (
    <Link to={`/tools/${toolId}`} className="bento-chip">
      <span className="ic-s" style={{ background: swatch }} />{' '}
      {t('home.bento.chip.composed', { name: shortName, context })}
      {stateSuffix}
    </Link>
  );
}

// Release-status badge so both Home skins disclose how far each tool can be trusted.
function StatusBadge({ releaseState }: { releaseState: ReleaseState }) {
  const { t } = useI18n();
  const key = releaseStateBadgeKey(releaseState);
  if (!key) return null;
  const label = t(key);

  const isUnavailable = releaseState === 'disabled';
  return (
    <span
      className={cn(
        'absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        isUnavailable
          ? 'bg-red-500/15 text-red-700 dark:text-red-300'
          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
      )}
      aria-label={label}
    >
      {label}
    </span>
  );
}
