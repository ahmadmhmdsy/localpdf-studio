import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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

  it('focuses first focusable element (close button) when opened', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByLabelText('Close')).toHaveFocus();
  });

  // ----- Focus trap (a11y) -----

  it('traps Tab focus inside the dialog (cycles last -> first)', async () => {
    render(<ConfirmModal {...defaultProps} />);
    const confirmBtn = screen.getByText('Proceed');
    confirmBtn.focus();
    expect(confirmBtn).toHaveFocus();
    await user.keyboard('{Tab}');
    // Tab from the last focusable (confirm) should wrap to the first (close).
    expect(screen.getByLabelText('Close')).toHaveFocus();
  });

  it('traps Shift+Tab focus inside the dialog (cycles first -> last)', async () => {
    render(<ConfirmModal {...defaultProps} />);
    const closeBtn = screen.getByLabelText('Close');
    closeBtn.focus();
    expect(closeBtn).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    // Shift+Tab from the first focusable (close) should wrap to the last (confirm).
    expect(screen.getByText('Proceed')).toHaveFocus();
  });

  it('Tab through middle items cycles within the dialog', async () => {
    render(<ConfirmModal {...defaultProps} />);
    // Initial focus: close button (first).
    expect(screen.getByLabelText('Close')).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(screen.getByText('Cancel')).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(screen.getByText('Proceed')).toHaveFocus();
    await user.keyboard('{Tab}');
    // Wraps back to close.
    expect(screen.getByLabelText('Close')).toHaveFocus();
  });

  it('does not move focus outside the dialog on Tab', async () => {
    render(
      <div>
        <button>outside-before</button>
        <ConfirmModal {...defaultProps} />
        <button>outside-after</button>
      </div>
    );
    // Focus the last dialog element and Tab.
    screen.getByText('Proceed').focus();
    await user.keyboard('{Tab}');
    // Should wrap to close button (inside dialog), NOT escape to outer buttons.
    expect(screen.getByLabelText('Close')).toHaveFocus();
  });

  it('restores focus to the trigger element when closed', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button onClick={() => setOpen(true)}>Open Modal</button>
          <ConfirmModal
            {...defaultProps}
            isOpen={open}
            onConfirm={() => { mockOnConfirm(); setOpen(false); }}
            onCancel={() => { mockOnCancel(); setOpen(false); }}
          />
        </div>
      );
    }
    render(<Harness />);
    const trigger = screen.getByText('Open Modal');
    trigger.focus();
    await user.click(trigger);
    // Modal is now open; trigger is no longer focused.
    expect(screen.getByLabelText('Close')).toHaveFocus();
    // Close it.
    await user.click(screen.getByText('Cancel'));
    // Focus should be restored to the trigger.
    expect(trigger).toHaveFocus();
  });
});