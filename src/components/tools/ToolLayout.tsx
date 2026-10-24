import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import StepTrack from './StepTrack';

interface ToolLayoutProps {
  children: ReactNode;
  steps?: string[];
  currentStep?: number;
  kicker?: string;
  title?: ReactNode;
  description?: string;
  className?: string;
}

export default function ToolLayout({
  children,
  steps,
  currentStep,
  kicker,
  title,
  description,
  className,
}: ToolLayoutProps) {
  const hasHeader = kicker || title || description;

  return (
    <div
      className={cn(
        'container mx-auto px-4 py-12 flex flex-col items-center min-h-[calc(100vh-130px)]',
        className
      )}
    >
      {steps && steps.length > 0 && currentStep !== undefined && (
        <StepTrack steps={steps} currentStep={currentStep} />
      )}

      {hasHeader && (
        <div 
          className="text-center mb-8 max-w-3xl"
          style={{
            animation: 'fade-up 400ms cubic-bezier(0.32,0.72,0,1) both',
          }}
        >
          {kicker && (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--accent-text)',
                marginBottom: '12px',
              }}
            >
              {kicker}
            </p>
          )}

          {title && (
            <h1
              style={{
                fontFamily: 'sans-serif',
                fontSize: 'clamp(28px, 5vw, 42px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                marginBottom: description ? '16px' : 0,
                color: 'var(--text)',
              }}
            >
              {title}
            </h1>
          )}

          {description && (
            <p
              style={{
                fontFamily: 'sans-serif',
                fontSize: '16px',
                lineHeight: 1.6,
                color: 'var(--text-2)',
                maxWidth: '540px',
                margin: '0 auto',
              }}
            >
              {description}
            </p>
          )}
        </div>
      )}

      <div
        className="w-full flex-1 flex flex-col items-center"
        style={!hasHeader ? { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
