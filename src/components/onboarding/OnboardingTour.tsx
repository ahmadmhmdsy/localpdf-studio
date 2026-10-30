import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import type { MessageKey } from '../../i18n';
import { useI18n } from '../../i18n/useI18n';

const STORAGE_KEY = 'pdf_studio_onboarded';
const TOTAL_STEPS = 4;

const STEPS: { title: MessageKey; description: MessageKey }[] = [
  { title: 'tour.step1.title', description: 'tour.step1.body' },
  { title: 'tour.step2.title', description: 'tour.step2.body' },
  { title: 'tour.step3.title', description: 'tour.step3.body' },
  { title: 'tour.step4.title', description: 'tour.step4.body' },
];

interface OnboardingTourProps {
  /** Force-show the tour (used for tests and the "Show tour" menu item). */
  forceShow?: boolean;
}

export default function OnboardingTour({ forceShow = false }: OnboardingTourProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      const alreadyOnboarded = window.localStorage.getItem(STORAGE_KEY) === 'true';
      if (!alreadyOnboarded) setIsOpen(true);
    } catch {
      // localStorage may be unavailable (private mode, sandboxed iframe) —
      // silently open the tour rather than blocking first-run UX.
      setIsOpen(true);
    }
  }, [forceShow]);

  const handleComplete = () => {
    setIsOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore storage failures
    }
  };

  // Focus trap + ESC dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleComplete();
        return;
      }
      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    // Focus the next/finish button on open
    requestAnimationFrame(() => {
      const nextBtn = dialogRef.current?.querySelector<HTMLButtonElement>('[data-tour-primary]');
      nextBtn?.focus();
    });
    return () => document.removeEventListener('keydown', handleKey);
    // handleComplete is stable (see below) so it does not need to be a dep.
  }, [isOpen]);

  const next = () => {
    if (step + 1 >= TOTAL_STEPS) handleComplete();
    else setStep(step + 1);
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!isOpen) return null;
  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      <div
        ref={dialogRef}
        className="bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold text-red-600 uppercase tracking-wider"
              aria-live="polite"
              aria-atomic="true"
            >
              {t('tour.stepOf', { step: step + 1, total: TOTAL_STEPS })}
            </span>
          </div>
          <button
            ref={closeButtonRef}
            onClick={handleComplete}
            className="p-1 text-[var(--text-3)] hover:text-[var(--text-2)] rounded-full hover:bg-[var(--surface-2)] transition-colors"
            aria-label={t('tour.skip')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <h2 id="onboarding-title" className="text-xl font-semibold text-[var(--text)]">
            {t(current.title)}
          </h2>
          <p id="onboarding-description" className="text-sm text-[var(--text-2)] leading-relaxed">
            {t(current.description)}
          </p>
        </div>

        <div className="px-6 pb-2" aria-hidden="true">
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-red-600' : 'bg-[var(--surface-2)]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]">
          <button
            onClick={handleComplete}
            className="text-sm font-medium text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
            aria-label={t('tour.skip')}
          >
            {t('tour.skip')}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={step === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
              aria-label={t('tour.previous')}
            >
              <ChevronLeft size={16} className="rtl:rotate-180" />
              {t('tour.back')}
            </button>
            <button
              onClick={next}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              aria-label={step + 1 >= TOTAL_STEPS ? t('tour.finishLabel') : t('tour.next')}
              data-tour-primary
            >
              {step + 1 >= TOTAL_STEPS ? (
                <>
                  <Check size={16} />
                  {t('tour.finish')}
                </>
              ) : (
                <>
                  {t('tour.nextShort')}
                  <ChevronRight size={16} className="rtl:rotate-180" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
