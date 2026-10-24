import { getToolPrivacyNotice, type ToolId } from '../../config/featureRegistry';

interface DataEgressNoticeProps {
  toolId: ToolId;
}

export default function DataEgressNotice({ toolId }: DataEgressNoticeProps) {
  return (
    <aside
      role="note"
      aria-label="Data handling"
      className="mx-4 mt-4 rounded-md border border-[var(--text-3)]/20 bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-2)]"
    >
      <span className="font-semibold text-[var(--text)]">Data handling: </span>
      {getToolPrivacyNotice(toolId)}
    </aside>
  );
}
