import type { ToolId } from '../../config/featureRegistry';
import { useI18n } from '../../i18n/useI18n';

interface DataEgressNoticeProps {
  toolId: ToolId;
}

export default function DataEgressNotice({ toolId }: DataEgressNoticeProps) {
  const { t, privacyNotice } = useI18n();
  return (
    <aside
      role="note"
      aria-label={t('privacy.dataHandling')}
      className="mx-4 mt-4 rounded-md border border-[var(--text-3)]/20 bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-2)]"
    >
      <span className="font-semibold text-[var(--text)]">{t('privacy.dataHandling')}: </span>
      {privacyNotice(toolId)}
    </aside>
  );
}
