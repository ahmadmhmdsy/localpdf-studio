import { Link } from 'react-router-dom';
import { TOOL_CATEGORIES } from '../constants/tools';
import { cn } from '../lib/utils';
import { useToast } from '../contexts/ToastContext';

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
  const { showToast } = useToast();

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
                      className={cn(
                        "group relative rounded-[28px] border border-white/5 bg-white/5 p-1.5 transition-all hover:bg-white/10",
                        !tool.isMVP && "opacity-60 grayscale cursor-not-allowed hover:bg-white/5"
                      )}
                      onClick={(e) => {
                        if (!tool.isMVP) {
                          e.preventDefault();
                          showToast({
                            message: "This feature is not available in the local MVP version yet.",
                            type: 'warning',
                            duration: 3000,
                          });
                        }
                      }}
                    >
                      <div className="rounded-[calc(28px-4px)] bg-[var(--surface)] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
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
