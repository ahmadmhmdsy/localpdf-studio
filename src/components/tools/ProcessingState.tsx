import { cn } from '../../lib/utils';

interface ProcessingStateProps {
  title?: string;
  description?: string;
  progress?: number;
  statusMessage?: string;
}

const PROCESSING_STEPS = [
  'Validating files',
  'Processing pages…',
  'Finalizing',
];

export default function ProcessingState({
  title,
  description,
  progress = 0,
  statusMessage,
}: ProcessingStateProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const getActiveStep = (): number => {
    if (clampedProgress < 35) return 0;
    if (clampedProgress < 75) return 1;
    return 2;
  };

  const activeStep = getActiveStep();

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div
      className="processing-state"
      style={{
        width: '100%',
        maxWidth: '680px',
        animation: 'fade-up 400ms cubic-bezier(0.32,0.72,0,1) both',
      }}
      role="status"
      aria-live="polite"
      aria-label="Processing your files"
    >
      <div
        className="processing-card"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '56px 48px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation: 'processing-enter 450ms cubic-bezier(0.32,0.72,0,1) both',
        }}
      >
        <div
          style={{
            content: '',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,107,157,0.03) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        <div className="processing-ring" style={{
          width: '100px',
          height: '100px',
          margin: '0 auto 32px',
          position: 'relative',
        }}>
          <svg
            viewBox="0 0 100 100"
            style={{ width: '100px', height: '100px', transform: 'rotate(-90deg)' }}
          >
            <circle
              className="processing-ring-bg"
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--surface-2)"
              strokeWidth="6"
            />
            <circle
              className="processing-ring-fill"
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                filter: 'drop-shadow(0 0 8px rgba(255,107,157,0.5))',
                transition: 'stroke-dashoffset 0.15s ease-out',
              }}
            />
          </svg>
          <div
            className="processing-ring-label"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
              fontSize: '20px',
              fontWeight: 500,
              color: 'var(--accent-text)',
            }}
          >
            {Math.round(clampedProgress)}%
          </div>
        </div>

        <h2
          className="processing-title"
          style={{
            fontFamily: 'sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '8px',
            color: 'var(--text)',
          }}
        >
          {statusMessage || title || 'Processing your files'}
        </h2>

        <p
          style={{
            color: 'var(--text-3)',
            fontSize: '14px',
            marginBottom: '28px',
            fontFamily: 'sans-serif',
          }}
        >
          {description || 'Please wait while we process your document locally.'}
        </p>

        <div className="processing-steps" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '300px',
          margin: '0 auto',
        }}>
          {PROCESSING_STEPS.map((step, index) => {
            const isActive = index === activeStep;
            const isDone = index < activeStep;

            return (
              <div
                key={index}
                className={cn('proc-step', isActive ? 'active' : '', isDone ? 'done' : '')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '13px',
                  color: isActive ? 'var(--text-2)' : isDone ? 'var(--accent-2)' : 'var(--text-3)',
                  fontFamily: 'sans-serif',
                  transition: 'color var(--transition)',
                }}
              >
                <div
                  className="proc-dot"
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isActive ? 'var(--accent-solid)' : isDone ? 'var(--accent-2)' : 'var(--surface-2)',
                    border: `1px solid ${isActive ? 'var(--accent-solid)' : isDone ? 'var(--accent-2)' : 'var(--border)'}`,
                    flexShrink: 0,
                    transition: 'all var(--transition)',
                    boxShadow: isActive ? '0 0 8px rgba(255,107,157,0.5)' : 'none',
                    animation: isActive ? 'pulse-dot 1s ease-in-out infinite' : 'none',
                  }}
                />
                {step}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
