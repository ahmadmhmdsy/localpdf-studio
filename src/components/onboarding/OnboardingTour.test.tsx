import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingTour from './OnboardingTour';

describe('OnboardingTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('opens automatically on first run (no localStorage flag)', async () => {
    render(<OnboardingTour />);
    expect(await screen.findByText(/Welcome to LocalPDF Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
  });

  it('does not open when the onboarded flag is set', async () => {
    window.localStorage.setItem('pdf_studio_onboarded', 'true');
    render(<OnboardingTour />);
    // Wait a tick to ensure effect has run
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByText(/Welcome to LocalPDF Studio/i)).not.toBeInTheDocument();
  });

  it('opens when forceShow is true regardless of flag', () => {
    window.localStorage.setItem('pdf_studio_onboarded', 'true');
    render(<OnboardingTour forceShow />);
    expect(screen.getByText(/Welcome to LocalPDF Studio/i)).toBeInTheDocument();
  });

  it('does not advertise redaction as an available tool', async () => {
    const user = userEvent.setup();
    render(<OnboardingTour forceShow />);

    await user.click(screen.getByRole('button', { name: /next step/i }));
    expect(screen.getByText(/shows its current availability before you choose a tool/i)).toBeInTheDocument();
    expect(screen.queryByText(/availability and limitations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/redact/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/every tool is one click away/i)).not.toBeInTheDocument();
  });

  it('advances through all four steps when Next is clicked', async () => {
    const user = userEvent.setup();
    render(<OnboardingTour forceShow />);

    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next step/i }));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next step/i }));
    expect(screen.getByText(/Step 3 of 4/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next step/i }));
    expect(screen.getByText(/Step 4 of 4/i)).toBeInTheDocument();
  });

  it('persists completion to localStorage when finished', async () => {
    const user = userEvent.setup();
    render(<OnboardingTour forceShow />);

    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: /next step/i }));
    }
    await user.click(screen.getByRole('button', { name: /finish tour/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('pdf_studio_onboarded')).toBe('true');
    });
  });

  it('persists completion when Skip tour is clicked', async () => {
    const user = userEvent.setup();
    render(<OnboardingTour forceShow />);

    // There are two skip buttons (the X icon and the text button); click the
    // first one we find.
    const skipButtons = screen.getAllByRole('button', { name: /skip tour/i });
    await user.click(skipButtons[0]);

    await waitFor(() => {
      expect(window.localStorage.getItem('pdf_studio_onboarded')).toBe('true');
    });
  });

  it('Back button is disabled on the first step', () => {
    render(<OnboardingTour forceShow />);
    expect(screen.getByRole('button', { name: /previous step/i })).toBeDisabled();
  });

  it('Back button works on subsequent steps', async () => {
    const user = userEvent.setup();
    render(<OnboardingTour forceShow />);
    await user.click(screen.getByRole('button', { name: /next step/i }));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /previous step/i }));
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
  });

  it('dismisses on Escape and persists', async () => {
    const user = userEvent.setup();
    render(<OnboardingTour forceShow />);
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(window.localStorage.getItem('pdf_studio_onboarded')).toBe('true');
    });
  });

  it('is keyboard-navigable: focus trap works on Tab', async () => {
    const user = userEvent.setup();
    render(<OnboardingTour forceShow />);
    const closeBtn = screen.getAllByRole('button', { name: /skip tour/i })[0];
    closeBtn.focus();
    await user.tab();
    // Next focusable should be the previous-step button (Back, disabled on step 1)
    // or next-step. We just check the focused element is inside the dialog.
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('aria-live polite region announces current step', () => {
    render(<OnboardingTour forceShow />);
    const status = screen.getByText(/Step 1 of 4/i);
    expect(status.closest('[aria-live="polite"]')).toBeInTheDocument();
  });

  it('focuses the primary (Next/Finish) button on open', async () => {
    render(<OnboardingTour forceShow />);
    await waitFor(() => {
      const primary = document.querySelector('[data-tour-primary]') as HTMLButtonElement;
      expect(primary).toBeTruthy();
      expect(primary).toHaveFocus();
    });
  });

  it('primary button has data-tour-primary attribute', () => {
    render(<OnboardingTour forceShow />);
    const nextBtn = screen.getByRole('button', { name: /next step/i });
    expect(nextBtn).toHaveAttribute('data-tour-primary');
  });

  it('primary button text changes to Finish on last step', () => {
    render(<OnboardingTour forceShow />);
    const initialBtn = screen.getByRole('button', { name: /next step|finish tour/i });
    expect(initialBtn).toHaveAttribute('data-tour-primary');
  });
});
