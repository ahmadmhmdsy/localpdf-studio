import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

const STORAGE_KEY = 'pdf_studio_onboarded';
const TOTAL_STEPS = 4;

export interface TourStep {
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to LocalPDF Studio',
    description:
      'A privacy-first PDF toolkit that runs entirely in your browser. ' +
      'No files are ever uploaded to a server.',
  },
  {
    title: 'Pick a tool',
    description:
      'Open the Home page to browse PDF tools, including merge, split, convert, and sign. ' +
      'Each card shows its current availability before you choose a tool.',
  },
  {
    title: 'Upload and process',
    description:
      'Drop a PDF into the upload zone. Files are read locally and processed in your browser using pdf-lib and pdfjs.',
  },
  {
    title: 'Use the Editor for full control',
    description:
      'Open /editor for the visual workspace: reorder pages, annotate, sign, and export. ' +
      'Press ? at any time to see all keyboard shortcuts.',
  },
];

interface OnboardingTourProps {
  /** Force-show the tour (used for tests and the "Show tour" menu item). */
  forceShow?: boolean;
}

export default function OnboardingTour({ forceShow = false }: OnboardingTourProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              Step {step + 1} of {TOTAL_STEPS}
            </span>
          </div>
          <button
            ref={closeButtonRef}
            onClick={handleComplete}
            className="p-1 text-[var(--text-3)] hover:text-[var(--text-2)] rounded-full hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Skip tour"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <h2 id="onboarding-title" className="text-xl font-semibold text-[var(--text)]">
            {current.title}
          </h2>
          <p id="onboarding-description" className="text-sm text-[var(--text-2)] leading-relaxed">
            {current.description}
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
            aria-label="Skip tour"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={step === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
              aria-label="Previous step"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <button
              onClick={next}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              aria-label={step + 1 >= TOTAL_STEPS ? 'Finish tour' : 'Next step'}
              data-tour-primary
            >
              {step + 1 >= TOTAL_STEPS ? (
                <>
                  <Check size={16} />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
