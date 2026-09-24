import { Link } from 'react-router-dom';
import { TOOL_CATEGORIES } from '../constants/tools';
import { getToolAvailability, isToolAvailable, type ReleaseState } from '../config/featureRegistry';
import { cn } from '../lib/utils';
import { useToast } from '../contexts/ToastContext';
import { useToolsStore } from '../store/toolsStore';
import HomeBento from './home/HomeBento';

const EDITOR_INTEGRATED_TOOLS = [
  'organize-pdf',
  'remove-pages',
  'extract-pages',
  'rotate-pdf',
  'add-watermark',
  'crop-pdf',
  'edit-pdf',
  'sign-pdf',
  'redact-pdf'
];

export default function Home() {
  const skin = useToolsStore((s) => s.skin);
  const { showToast } = useToast();

  // Bento skin has its own topbar / hero / privacy block inside the
  // main column (the sidebar is rendered by Layout.tsx). Render it whole.
  if (skin === 'bento') {
    return <HomeBento />;
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-12">
      <div className="mb-16 text-center">
        <h1 className="mb-4 font-bold tracking-tight text-[var(--text)]" style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800 }}>
          <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--accent-2)] to-[var(--accent-4)] bg-clip-text text-transparent">Every tool you need</span>{' '}
          <span>to work with PDFs in one place</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-[var(--text-2)]">
          Every tool you need to use PDFs, at your fingertips. All are 100% FREE and process locally in your browser for maximum privacy.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        {TOOL_CATEGORIES.map((category) => (
          <section key={category.name} className="flex flex-col gap-6">
            <h2 className="text-sm font-bold tracking-wider text-[var(--text-3)] uppercase">
              {category.name}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {category.tools.map((tool, toolIndex) => {
                const Icon = tool.icon;
                const availability = getToolAvailability(tool.id);
                const unavailable = !isToolAvailable(tool.id);
                const isIntegrated = EDITOR_INTEGRATED_TOOLS.includes(tool.id);
                const targetPath = isIntegrated ? `/editor?tool=${tool.id}` : `/tools/${tool.id}`;

                return (
                  <div
                    key={tool.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${toolIndex * 50}ms` }}
                  >
                    <Link
                      to={tool.isMVP ? targetPath : '#'}
                      aria-disabled={unavailable ? true : undefined}
                      className={cn(
                        "group relative rounded-[28px] border border-white/5 bg-[var(--surface)]/5 p-1.5 transition-all hover:bg-[var(--surface)]/10",
                        (unavailable || !tool.isMVP) && "opacity-60 grayscale cursor-not-allowed hover:bg-[var(--surface)]/5"
                      )}
                      onClick={(e) => {
                        if (unavailable || !tool.isMVP) {
                          e.preventDefault();
                          showToast({
                            message: unavailable ? "This tool is unavailable while known defects are being remedied." : "This feature is not available in the local MVP version yet.",
                            type: 'warning',
                            duration: 3000,
                          });
                        }
                      }}
                    >
                      <div className="rounded-[calc(28px-4px)] bg-[var(--surface)] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                        <StatusBadge releaseState={availability.releaseState} />
                        <div className={cn("rounded-[var(--radius-md)] p-2 bg-[var(--surface-2)] group-hover:animate-icon-float transition-transform", tool.color)}>
                          <Icon size={32} strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="mb-2 font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                            {tool.name}
                          </h3>
                          <p className="text-sm text-[var(--text-3)] line-clamp-3">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}


// Release-status badge rendered so users can see how far each tool can be trusted.
function StatusBadge({ releaseState }: { releaseState: ReleaseState }) {
  if (releaseState === 'disabled') {
    return (
      <span className="absolute right-3 top-3 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500" aria-label="Unavailable">
        Unavailable
      </span>
    );
  }
  if (releaseState === 'limited' || releaseState === 'experimental') {
    return (
      <span className="absolute right-3 top-3 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500" aria-label="Limited">
        Limited
      </span>
    );
  }
  return null;
}
