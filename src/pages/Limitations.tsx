import { TOOL_CATEGORIES } from '../constants/tools';
import { TOOL_RELEASE_REGISTRY } from '../config/featureRegistry';
import type { ToolId } from '../config/featureRegistry';
import { useI18n } from '../i18n/useI18n';

/**
 * Known Limitations page.
 * 
 * This page lists all tools with their current limitations and explains
 * what's being worked on. It helps users understand what each tool can
 * and cannot do.
 */
export default function Limitations() {
  const { toolName, toolDescription } = useI18n();

  // Get all tools with their release state; display copy comes from the active locale.
  const toolsWithState = TOOL_CATEGORIES.flatMap((category) =>
    category.tools.map((tool) => ({
      id: tool.id,
      name: toolName(tool.id),
      description: toolDescription(tool.id),
      releaseState: TOOL_RELEASE_REGISTRY[tool.id as ToolId]?.releaseState ?? 'stable',
      support: TOOL_RELEASE_REGISTRY[tool.id as ToolId]?.support,
      limitation: TOOL_RELEASE_REGISTRY[tool.id as ToolId]?.limitation,
    }))
  );

  // Group by release state
  const disabledTools = toolsWithState.filter((t) => t.releaseState === 'disabled');
  const limitedTools = toolsWithState.filter((t) => t.releaseState === 'limited');
  const stableTools = toolsWithState.filter((t) => t.releaseState === 'stable');

  return (
    <div className="min-h-screen bg-[var(--bg)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-4">
          Known Limitations
        </h1>
        <p className="text-[var(--text-3)] mb-8">
          LocalPDF Studio is actively under development. Some tools have limitations
          or are temporarily unavailable. This page explains the current status
          of each tool.
        </p>

        {/* Disabled Tools */}
        {disabledTools.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              Unavailable Tools
            </h2>
            <div className="space-y-4">
              {disabledTools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4"
                >
                  <h3 className="font-semibold text-[var(--text)]">{tool.name}</h3>
                  <p className="text-sm text-[var(--text-3)] mt-1">
                    {tool.support || tool.limitation || 'This tool is currently unavailable.'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Limited Tools */}
        {limitedTools.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              Tools with Limitations
            </h2>
            <div className="space-y-4">
              {limitedTools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4"
                >
                  <h3 className="font-semibold text-[var(--text)]">{tool.name}</h3>
                  {tool.support && (
                    <p className="text-sm text-[var(--text-2)] mt-1">
                      <strong>What works:</strong> {tool.support}
                    </p>
                  )}
                  {tool.limitation && (
                    <p className="text-sm text-[var(--text-3)] mt-1">
                      <strong>Limitations:</strong> {tool.limitation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stable Tools */}
        {stableTools.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Fully Available Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stableTools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4"
                >
                  <h3 className="font-semibold text-[var(--text)]">{tool.name}</h3>
                  <p className="text-sm text-[var(--text-3)] mt-1">{tool.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* General Notes */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-3">General Notes</h2>
          <ul className="space-y-2 text-sm text-[var(--text-3)]">
            <li>• All PDF processing happens locally in your browser — your files never leave your device.</li>
            <li>• AI tools (Summarize, Translate) require a Gemini API key and are only available in the desktop build.</li>
            <li>• PDF encryption/decryption is not supported due to pdf-lib limitations.</li>
            <li>• Redaction tools are not available and should not be used as a confidentiality boundary.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
