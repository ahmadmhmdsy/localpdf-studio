import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StepTrackProps {
  steps: string[];
  currentStep: number;
}

export default function StepTrack({ steps, currentStep }: StepTrackProps) {
  return (
    <div 
      className="step-track"
      style={{
        display: 'flex',
        gap: '4px',
        justifyContent: 'center',
        marginBottom: '36px',
        animation: 'fade-up 600ms 50ms cubic-bezier(0.32,0.72,0,1) both',
      }}
      role="list"
      aria-label="Progress steps"
    >
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isDone = index < currentStep;

        return (
          <div
            key={index}
            className={cn('step-item', isActive ? 'active' : '', isDone ? 'done' : '')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: isActive ? 'var(--accent-text)' : isDone ? 'var(--accent-2)' : 'var(--text-3)',
              padding: '6px 12px',
              borderRadius: '100px',
              border: '1px solid transparent',
              transition: 'all var(--transition)',
              background: isActive ? 'rgba(255,107,157,0.1)' : 'transparent',
              borderColor: isActive ? 'rgba(255,107,157,0.25)' : 'transparent',
            }}
            role="listitem"
            aria-current={isActive ? 'step' : undefined}
          >
            <div
              className="step-num"
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: isActive ? 'var(--accent-solid)' : isDone ? 'var(--accent-2)' : 'var(--surface-2)',
                border: `1px solid ${isActive ? 'var(--accent-solid)' : isDone ? 'var(--accent-2)' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 600,
                fontFamily: 'sans-serif',
                transition: 'all var(--transition)',
                color: isActive || isDone ? 'var(--bg)' : 'var(--text-2)',
                boxShadow: isActive ? '0 0 12px rgba(255,107,157,0.4)' : 'none',
                position: 'relative',
              }}
            >
              {isDone ? (
                <Check 
                  size={10} 
                  strokeWidth={3} 
                  style={{ 
                    color: 'var(--bg)',
                    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))'
                  }} 
                />
              ) : (
                <span style={{ 
                  fontFamily: 'sans-serif',
                  fontSize: '10px',
                  fontWeight: 600,
                }}>
                  {index + 1}
                </span>
              )}
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    inset: '-2px',
                    borderRadius: '50%',
                    border: '2px solid var(--accent)',
                    opacity: 0.4,
                    animation: 'pulse-dot 1.5s ease-in-out infinite',
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                letterSpacing: '0.02em',
              }}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
