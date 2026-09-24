import { Link } from 'react-router-dom';
import { AlertTriangle, CircleSlash, Home } from 'lucide-react';
import type { ToolId } from '../../config/featureRegistry';
import { getToolAvailability } from '../../config/featureRegistry';
import ToolLayout from './ToolLayout';

interface ToolAvailabilityGateProps {
  toolId: ToolId;
  toolName: string;
  children: React.ReactNode;
}

/**
 * Renders the tool workflow only when the registry allows it.
 *
 * - stable: children rendered unchanged.
 * - limited/experimental: children plus a visible, non-blocking limitation alert.
 * - disabled: children are NOT rendered (the tool workflow never mounts);
 *   a truthful unavailable screen is shown instead, with a link back Home.
 */
export default function ToolAvailabilityGate({
  toolId,
  toolName,
  children,
}: ToolAvailabilityGateProps) {
  const availability = getToolAvailability(toolId);

  if (availability.releaseState === 'disabled') {
    return (
      <ToolLayout
        kicker={toolName}
        title="This tool is unavailable"
        description="This tool is temporarily unavailable while known defects are being remedied. See the production inventory for the current remediation status."
      >
        <div className="w-full max-w-xl" role="alert">
          <div className="rounded-lg border border-[var(--text-3)]/20 bg-[var(--surface)] p-6 pb-8 shadow-md">
            <p className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--text-3)] uppercase tracking-wider">
              <CircleSlash size={18} aria-hidden="true" />
              Unavailable
            </p>
            <h2 className="mb-2 text-lg font-bold text-[var(--text)]">
              {toolName} is not available right now
            </h2>
            <p
              data-testid="tool-limitation"
              className="text-sm leading-relaxed text-[var(--text-2)]"
            >
              {availability.limitation}
            </p>
          </div>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-md,6px)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            <Home size={16} aria-hidden="true" />
            Home
          </Link>
        </div>
      </ToolLayout>
    );
  }

  const showLimitation =
    availability.releaseState !== 'stable' &&
    availability.limitation.trim().length > 0;

  return (
    <>
      {showLimitation && (
        <div
          role="status"
          data-testid="tool-limitation-alert"
          className="container mx-auto max-w-3xl px-4 pt-4"
        >
          <div
            aria-live="polite"
            className="flex items-start gap-3 rounded-[var(--radius-md,6px)] border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-[var(--text)]"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
            <div>
              <span className="font-semibold uppercase tracking-wider text-xs">Limitation</span>
              <p className="mt-1 leading-relaxed text-[var(--text-2)]">
                {availability.limitation}
              </p>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
