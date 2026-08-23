import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../../contexts/ToastContext';
import ToastContainer from './ToastContainer';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  );
}

function ShowToasts() {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast({ message: 'Info toast', type: 'info', duration: 0 })}>Info</button>
      <button onClick={() => showToast({ message: 'Success toast', type: 'success', duration: 0 })}>Success</button>
      <button onClick={() => showToast({ message: 'Warning toast', type: 'warning', duration: 0 })}>Warning</button>
      <button onClick={() => showToast({ message: 'Error toast', type: 'error', duration: 0 })}>Error</button>
    </div>
  );
}

describe('ToastContainer', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when no toasts', () => {
    render(<TestWrapper><div /></TestWrapper>);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders info toast', async () => {
    render(<TestWrapper><ShowToasts /></TestWrapper>);
    await user.click(screen.getByText('Info'));
    expect(screen.getByText('Info toast')).toBeInTheDocument();
  });

  it('renders success toast', async () => {
    render(<TestWrapper><ShowToasts /></TestWrapper>);
    await user.click(screen.getByText('Success'));
    expect(screen.getByText('Success toast')).toBeInTheDocument();
  });

  it('renders warning toast', async () => {
    render(<TestWrapper><ShowToasts /></TestWrapper>);
    await user.click(screen.getByText('Warning'));
    expect(screen.getByText('Warning toast')).toBeInTheDocument();
  });

  it('renders error toast', async () => {
    render(<TestWrapper><ShowToasts /></TestWrapper>);
    await user.click(screen.getByText('Error'));
    expect(screen.getByText('Error toast')).toBeInTheDocument();
  });

  it('dismisses toast when close button clicked', async () => {
    render(<TestWrapper><ShowToasts /></TestWrapper>);
    await user.click(screen.getByText('Info'));
    const closeBtn = screen.getByLabelText('Dismiss notification');
    await user.click(closeBtn);
    expect(screen.queryByText('Info toast')).not.toBeInTheDocument();
  });

  it('renders multiple toasts', async () => {
    render(<TestWrapper><ShowToasts /></TestWrapper>);
    await user.click(screen.getByText('Info'));
    await user.click(screen.getByText('Success'));
    const alerts = screen.getAllByRole('status');
    expect(alerts).toHaveLength(2);
  });
});
