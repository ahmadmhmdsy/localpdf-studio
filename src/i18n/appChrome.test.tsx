import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import OnboardingTour from '../components/onboarding/OnboardingTour';
import ToolAvailabilityGate from '../components/tools/ToolAvailabilityGate';
import Limitations from '../pages/Limitations';
import NotFound from '../pages/NotFound';
import { useToolsStore } from '../store/toolsStore';

function Throws(): never {
  throw new Error('boom');
}

describe('app chrome in Arabic', () => {
  afterEach(() => {
    useToolsStore.setState({ locale: 'en' });
    vi.restoreAllMocks();
  });

  it('renders the not-found page', () => {
    useToolsStore.setState({ locale: 'ar' });
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'الصفحة غير موجودة' })).toBeInTheDocument();
  });

  it('renders the unavailable-tool gate', () => {
    useToolsStore.setState({ locale: 'ar' });
    render(
      <MemoryRouter>
        <ToolAvailabilityGate toolId="ai-summarizer" toolName="الملخص">
          <p>workflow</p>
        </ToolAvailabilityGate>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'الملخص غير متاحة حاليًا' })).toBeInTheDocument();
    expect(screen.queryByText('workflow')).not.toBeInTheDocument();
  });

  it('renders the tour', () => {
    useToolsStore.setState({ locale: 'ar' });
    render(<OnboardingTour forceShow />);
    expect(screen.getByText('الخطوة 1 من 4')).toBeInTheDocument();
  });

  it('renders the Limitations page', () => {
    useToolsStore.setState({ locale: 'ar' });
    render(<Limitations />);
    expect(screen.getByRole('heading', { name: 'القيود المعروفة' })).toBeInTheDocument();
  });

  it('keeps the Limitations page free of a blanket local-only promise', () => {
    render(<Limitations />);
    expect(screen.queryByText(/never leave your device/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Most tools process your file in your browser/)).toBeInTheDocument();
  });

  it('renders the app error boundary, which reads the locale without a hook', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useToolsStore.setState({ locale: 'ar' });
    render(
      <ErrorBoundary>
        <Throws />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'حدث خطأ ما' })).toBeInTheDocument();
  });
});
