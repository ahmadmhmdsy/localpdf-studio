import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../contexts/ToastContext';
import ToastContainer from '../components/ui/ToastContainer';

function TestComponent() {
  const { showToast, dismissToast, toasts } = useToast();
  return (
    <div>
      <button onClick={() => showToast({ message: 'Test message', type: 'info' })}>Show Toast</button>
      <button onClick={() => showToast({ message: 'Success!', type: 'success' })}>Show Success</button>
      <button onClick={() => showToast({ message: 'Warning!', type: 'warning' })}>Show Warning</button>
      <button onClick={() => showToast({ message: 'Error!', type: 'error' })}>Show Error</button>
      <button onClick={() => dismissToast(toasts[0]?.id)}>Dismiss First</button>
      <span data-testid="toast-count">{toasts.length}</span>
      <ToastContainer />
    </div>
  );
}

function renderWithToastProvider() {
  return render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>
  );
}

describe('ToastContext', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('showToast', () => {
    it('shows a toast with default settings', async () => {
      renderWithToastProvider();
      await user.click(screen.getByText('Show Toast'));
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });

    it('shows success toast', async () => {
      renderWithToastProvider();
      await user.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('shows warning toast', async () => {
      renderWithToastProvider();
      await user.click(screen.getByText('Show Warning'));
      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('shows error toast', async () => {
      renderWithToastProvider();
      await user.click(screen.getByText('Show Error'));
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    it('shows multiple toasts', async () => {
      renderWithToastProvider();
      await user.click(screen.getByText('Show Toast'));
      await user.click(screen.getByText('Show Success'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
    });
  });

  describe('dismissToast', () => {
    it('dismisses a specific toast', async () => {
      renderWithToastProvider();
      await user.click(screen.getByText('Show Toast'));
      await user.click(screen.getByText('Dismiss First'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  describe('useToast hook', () => {
    it('throws error when used outside provider', () => {
      function BrokenComponent() {
        useToast();
        return <div />;
      }
      expect(() => render(<BrokenComponent />)).toThrow('useToast must be used within a ToastProvider');
    });
  });
});
