import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal from './ConfirmModal';

describe('ConfirmModal', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    title: 'Test Title',
    message: 'Test message',
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  it('renders when open', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('displays custom confirm and cancel labels', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Yes, Delete"
        cancelLabel="No, Keep"
      />
    );
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
    expect(screen.getByText('No, Keep')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    render(<ConfirmModal {...defaultProps} />);
    await user.click(screen.getByText('Proceed'));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', async () => {
    render(<ConfirmModal {...defaultProps} />);
    await user.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when close button clicked', async () => {
    render(<ConfirmModal {...defaultProps} />);
    await user.click(screen.getByLabelText('Close'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape key', async () => {
    render(<ConfirmModal {...defaultProps} />);
    await user.keyboard('{Escape}');
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm on Enter key when confirm button is focused', async () => {
    render(<ConfirmModal {...defaultProps} />);
    const confirmBtn = screen.getByText('Proceed');
    confirmBtn.focus();
    await user.keyboard('{Enter}');
    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('displays message content', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        message="Important message here"
      />
    );
    expect(screen.getByText('Important message here')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<ConfirmModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Test Title');
  });

  it('renders danger variant by default', () => {
    render(<ConfirmModal {...defaultProps} />);
    const confirmBtn = screen.getByText('Proceed');
    expect(confirmBtn).toHaveClass('bg-red-600');
  });

  it('renders warning variant', () => {
    render(<ConfirmModal {...defaultProps} variant="warning" />);
    const confirmBtn = screen.getByText('Proceed');
    expect(confirmBtn).toHaveClass('bg-yellow-600');
  });

  it('renders info variant', () => {
    render(<ConfirmModal {...defaultProps} variant="info" />);
    const confirmBtn = screen.getByText('Proceed');
    expect(confirmBtn).toHaveClass('bg-blue-600');
  });

  it('displays AlertTriangle icon', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('displays message content', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        message="Important message here"
      />
    );
    expect(screen.getByText('Important message here')).toBeInTheDocument();
  });

  it('focuses confirm button when opened', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Proceed')).toHaveFocus();
  });
});
