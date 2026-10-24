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

  // Derived from the release registry so availability changes keep Home truthful.
  const availabilitySummary = useMemo(() => {
    const availableStates = ALL_TOOLS.map((tool) => getToolAvailability(tool.id)).filter(
      (availability) => availability.releaseState !== 'disabled'
    );
    const stateSummary = (['stable', 'limited', 'experimental'] as const)
      .map((state) => ({
        state,
        count: availableStates.filter((availability) => availability.releaseState === state).length,
      }))
      .filter(({ count }) => count > 0)
      .map(({ state, count }) => `${count} ${state}`)
      .join(' · ');

    return {
      count: availableStates.length,
      stateSummary: stateSummary || 'No tools currently available',
    };
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

  // Filter tools across all categories by name + description (case-insensitive).
  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOL_CATEGORIES;
    return TOOL_CATEGORIES
      .map((c) => ({
        ...c,
        tools: c.tools.filter((t) => {
          const hay = `${t.name} ${t.description}`.toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((c) => c.tools.length > 0);
  }, [query]);

  return (
    <>
      {/* Topbar */}
      <div className="bento-topbar">
        <div className="bento-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            placeholder={`Search ${availabilitySummary.count} tools — e.g. merge, watermark, sign…`}
            aria-label="Search tools"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="bento-actions">
          <button
            type="button"
            className="bento-icon-btn"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleDarkMode}
            title="Toggle theme"
          >
            {darkMode ? '☀' : '☾'}
          </button>
          <button
            type="button"
            className="bento-icon-btn"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Featured bento tiles */}
      <section className="bento-featured" aria-label="Featured">
        <article className="bento-tile bento-tile--hero">
          <span className="bento-privacy-badge">
            <span className="dot" /> Local-first
          </span>
          <h1>
            A complete <span>PDF workspace</span> that runs on your device.
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '1rem', maxWidth: '30em', marginBottom: '1.5rem' }}>
            {availabilitySummary.count} tools across {TOOL_CATEGORIES.length} categories. Open a file, do the work, close it. Most
            tools run locally; AI, OCR, and camera tools are unavailable in the public beta.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/tools/merge-pdf" className="btn btn--pri">
              Start merging →
            </Link>
            <Link to="/editor" className="btn btn--ghost">
              Open editor
            </Link>
          </div>
        </article>

        <article className="bento-tile" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {availabilitySummary.count}
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', fontFamily: 'ui-monospace, "JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.5rem' }}>
            Tools available
          </div>
          <div style={{ fontFamily: 'ui-monospace, "JetBrains Mono", monospace', fontSize: '0.7rem', color: 'var(--ok)', marginTop: '0.4rem' }}>
            {availabilitySummary.stateSummary}
          </div>
        </article>

        <article className="bento-tile" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {egressSummary.available}
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', fontFamily: 'ui-monospace, "JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.5rem' }}>
            Tools that can send data out
          </div>
          <div style={{ fontFamily: 'ui-monospace, "JetBrains Mono", monospace', fontSize: '0.7rem', color: 'var(--ok)', marginTop: '0.4rem' }}>
            {egressSummary.available === 0
              ? 'None available in this build'
              : `${egressSummary.available} of ${egressSummary.networked} enabled`}
          </div>
        </article>

        <article className="bento-tile" style={{ padding: '1.25rem' }}>
          <span className="bento-privacy-badge">
            <span className="dot" /> No account
          </span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>No account required</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
            No sign-up. No email. Open a tool and start working.
          </p>
        </article>
      </section>

      {/* Quick picks: a static example list, not a record of anything the reader did. */}
      <div className="bento-recent" id="quick-picks" aria-label="Example tools to try">
        <span className="label">Quick picks</span>
        <div className="items">
          <Link to="/tools/merge-pdf" className="bento-chip">
            <span className="ic-s" /> Merge — combine files
          </Link>
          <QuickChip toolId="compress-pdf" swatch="var(--accent-2)" context="shrink a file" />
          <Link to="/tools/sign-pdf" className="bento-chip">
            <span className="ic-s" style={{ background: 'var(--accent-4)' }} /> Sign — add a signature
          </Link>
          <QuickChip toolId="translate-pdf" swatch="var(--accent-3)" context="translate text" />
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
            No tools match "{query}"
          </h3>
          <p style={{ fontSize: '0.88rem' }}>Try a different keyword, or clear the search.</p>
        </div>
      ) : (
        filteredCategories.map((category) => (
          <section key={category.name} aria-label={category.name}>
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
                {category.name}
              </h2>
              <span className="meta">{category.tools.length} tools</span>
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
      <aside className="bento-privacy-deep" id="privacy" aria-label="Data handling">
        <div>
          <h3>Where your work is stored.</h3>
          <p>
            LocalPDF Studio processes most tools locally. AI, OCR, and camera tools are currently unavailable in the public beta; no file is sent to an external service from those routes. The
            editor keeps your working document and edit history in this app's local storage on this device, until you clear it: use the Close File control in the editor to
            drop the stored file, or clear this app's stored data (site data in the browser, app data on the desktop).
          </p>
        </div>
      </aside>
    </>
  );
}

function getReleaseStateLabel(releaseState: ReleaseState): string | null {
  if (releaseState === 'disabled') return 'Unavailable';
  if (releaseState === 'limited') return 'Limited';
  if (releaseState === 'experimental') return 'Experimental';
  return null;
}

function BentoToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const availability = getToolAvailability(tool.id);
  const unavailable = !isToolAvailable(tool.id);
  const targetPath = tool.isMVP ? `/tools/${tool.id}` : '#';
  const stateLabel = getReleaseStateLabel(availability.releaseState);
  const accessibleLabel = stateLabel
    ? `${tool.name} — ${tool.description} — ${stateLabel}`
    : `${tool.name} — ${tool.description}`;

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
        <div className="name" style={{ opacity: 0.55 }}>{tool.name}</div>
        <div className="desc" style={{ opacity: 0.55 }}>{tool.description}</div>
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
      <div className="name">{tool.name}</div>
      <div className="desc">{tool.description}</div>
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
  const entry = ALL_TOOLS.find((tool) => tool.id === toolId);
  const shortName = entry ? entry.name.replace(/\s+PDF$/i, '') : toolId;

  if (unavailable) {
    return (
      <span
        className="bento-chip"
        aria-disabled="true"
        style={{ color: 'var(--text-2)', textDecoration: 'line-through' }}
      >
        <span className="ic-s" style={{ background: swatch }} /> {shortName} — unavailable
      </span>
    );
  }

  const stateSuffix = availability.releaseState === 'stable' ? '' : ` (${availability.releaseState})`;
  return (
    <Link to={`/tools/${toolId}`} className="bento-chip">
      <span className="ic-s" style={{ background: swatch }} /> {shortName} — {context}
      {stateSuffix}
    </Link>
  );
}

// Release-status badge so both Home skins disclose how far each tool can be trusted.
function StatusBadge({ releaseState }: { releaseState: ReleaseState }) {
  const label = getReleaseStateLabel(releaseState);
  if (!label) return null;

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
