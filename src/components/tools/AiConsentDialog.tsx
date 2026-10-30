import { useState } from 'react';
import { Sparkles, Shield, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';

interface AiConsentDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  toolName: string;
}

export default function AiConsentDialog({
  isOpen,
  onAccept,
  onDecline,
  toolName,
}: AiConsentDialogProps) {
  const { t } = useI18n();
  const [isDeclining, setIsDeclining] = useState(false);

  if (!isOpen) return null;

  const handleDecline = () => {
    setIsDeclining(true);
    onDecline();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          animation: 'fade-up 300ms cubic-bezier(0.32,0.72,0,1) both',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139, 92, 246, 0.15)' }}
          >
            <Sparkles className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h2
              id="ai-consent-title"
              className="text-lg font-semibold text-[var(--text)]"
            >
              {t('tool.aiConsent.title')}
            </h2>
            <p className="text-sm text-[var(--text-3)]">{toolName}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
            <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--text-2)]">{t('tool.aiConsent.dataTitle')}</p>
              <p className="text-xs text-[var(--text-3)] mt-1">
                {t('tool.aiConsent.dataBody')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--text-2)]">{t('tool.aiConsent.costTitle')}</p>
              <p className="text-xs text-[var(--text-3)] mt-1">
                {t('tool.aiConsent.costBody')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            disabled={isDeclining}
            className="flex-1 px-4 py-2.5 text-[var(--text-2)] font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
          >
            {t('tool.aiConsent.decline')}
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
          >
            {t('tool.aiConsent.accept')}
          </button>
        </div>

        <p className="text-xs text-[var(--text-3)] text-center mt-4">
          {t('tool.aiConsent.settingsNote')}
        </p>
      </div>
    </div>
  );
}
