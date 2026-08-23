import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Settings } from 'lucide-react';
import { TOOL_CATEGORIES, Tool } from '../../constants/tools';
import { useToolsStore } from '../../store/toolsStore';
import { cn } from '../../lib/utils';

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
            placeholder="Search 31 tools — e.g. compress, redact, watermark…"
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
            <span className="dot" /> 100% on-device
          </span>
          <h1>
            A complete <span>PDF workspace</span> that lives in your browser.
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '1rem', maxWidth: '30em', marginBottom: '1.5rem' }}>
            31 tools, 7 categories, zero servers touched. Open a file, do the work, close the tab. Nothing persists, nothing phones home.
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
          <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>31</div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', fontFamily: 'ui-monospace, "JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.5rem' }}>
            Tools available
          </div>
          <div style={{ fontFamily: 'ui-monospace, "JetBrains Mono", monospace', fontSize: '0.7rem', color: 'var(--ok)', marginTop: '0.4rem' }}>
            ▲ 2 this month
          </div>
        </article>

        <article className="bento-tile" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>0</div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', fontFamily: 'ui-monospace, "JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.5rem' }}>
            Bytes uploaded
          </div>
          <div style={{ fontFamily: 'ui-monospace, "JetBrains Mono", monospace', fontSize: '0.7rem', color: 'var(--ok)', marginTop: '0.4rem' }}>
            Always zero
          </div>
        </article>

        <article className="bento-tile" style={{ padding: '1.25rem' }}>
          <span className="bento-privacy-badge">
            <span className="dot" /> Private
          </span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>No account required</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
            No sign-up. No email. No tracking pixels. Just a working set of tools.
          </p>
        </article>
      </section>

      {/* Recent strip (static sample, no persistence for now) */}
      <div className="bento-recent" id="recent" aria-label="Recently used">
        <span className="label">Recent</span>
        <div className="items">
          <Link to="/tools/merge-pdf" className="bento-chip">
            <span className="ic-s" /> Merge — Q3 investor update
          </Link>
          <Link to="/tools/compress-pdf" className="bento-chip">
            <span className="ic-s" style={{ background: 'var(--accent-2)' }} /> Compress — scan_2025
          </Link>
          <Link to="/tools/sign-pdf" className="bento-chip">
            <span className="ic-s" style={{ background: 'var(--accent-4)' }} /> Sign — proposal
          </Link>
          <Link to="/tools/translate-pdf" className="bento-chip">
            <span className="ic-s" style={{ background: 'var(--accent-3)' }} /> Translate — brochure
          </Link>
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
      <aside className="bento-privacy-deep" id="privacy" aria-label="Privacy guarantee">
        <div className="num">0</div>
        <div>
          <h3>The number of bytes we keep of your work.</h3>
          <p>
            LocalPDF Studio runs entirely in your browser. The only network call in this product
            is the one you make when you ask the AI tools to think — and even then, only the
            text you explicitly send leaves the page. We do not log, sync, or back up your files.
          </p>
        </div>
        <a
          href="#"
          style={{
            padding: '0.85rem 1.5rem',
            background: 'var(--accent-2)',
            color: 'var(--ink)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.92rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          Read the privacy note →
        </a>
      </aside>
    </>
  );
}

function BentoToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const targetPath = tool.isMVP ? `/tools/${tool.id}` : '#';

  return (
    <Link
      to={targetPath}
      className="bento-tool"
      aria-label={`${tool.name} — ${tool.description}`}
      aria-disabled={!tool.isMVP ? true : undefined}
    >
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md text-white',
          'bg-[var(--bg-2)]'
        )}
        style={{
          background: 'var(--bg-2)',
        }}
      >
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="name">{tool.name}</div>
      <div className="desc">{tool.description}</div>
    </Link>
  );
}
