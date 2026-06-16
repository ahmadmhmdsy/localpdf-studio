import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignatureModal from './SignatureModal';

describe('SignatureModal', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  it('renders when open', () => {
    render(<SignatureModal {...defaultProps} />);
    expect(screen.getByText('Create Signature')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SignatureModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Create Signature')).not.toBeInTheDocument();
  });

  it('shows Draw tab as active by default', () => {
    render(<SignatureModal {...defaultProps} />);
    const drawTab = screen.getByRole('tab', { name: 'Draw signature' });
    expect(drawTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Type tab when clicked', async () => {
    render(<SignatureModal {...defaultProps} />);
    await user.click(screen.getByRole('tab', { name: 'Type signature' }));
    expect(screen.getByRole('tab', { name: 'Type signature' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Type your signature text')).toBeInTheDocument();
  });

  it('shows drawing canvas in draw mode', () => {
    render(<SignatureModal {...defaultProps} />);
    expect(screen.getByLabelText('Signature drawing canvas')).toBeInTheDocument();
  });

  it('shows placeholder text when canvas is empty', () => {
    render(<SignatureModal {...defaultProps} />);
    expect(screen.getByText('Draw your signature here')).toBeInTheDocument();
  });

  it('shows type input in type mode', async () => {
    render(<SignatureModal {...defaultProps} />);
    await user.click(screen.getByRole('tab', { name: 'Type signature' }));
    expect(screen.getByLabelText('Type your signature text')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    render(<SignatureModal {...defaultProps} />);
    await user.click(screen.getByLabelText('Close signature dialog'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button clicked', async () => {
    render(<SignatureModal {...defaultProps} />);
    await user.click(screen.getByLabelText('Cancel signature'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('disables Save & Add button when canvas is empty', () => {
    render(<SignatureModal {...defaultProps} />);
    expect(screen.getByLabelText('Save and add signature to document')).toBeDisabled();
  });

  it('has correct ARIA attributes', () => {
    render(<SignatureModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Signature creation dialog');
  });

  it('has tablist role for mode selector', () => {
    render(<SignatureModal {...defaultProps} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('shows Clear button in draw mode', () => {
    render(<SignatureModal {...defaultProps} />);
    expect(screen.getByLabelText('Clear signature canvas')).toBeInTheDocument();
  });

  it('shows Clear button in type mode', async () => {
    render(<SignatureModal {...defaultProps} />);
    await user.click(screen.getByRole('tab', { name: 'Type signature' }));
    expect(screen.getByLabelText('Clear typed signature')).toBeInTheDocument();
  });

  it('shows hint about cursive font in type mode', async () => {
    render(<SignatureModal {...defaultProps} />);
    await user.click(screen.getByRole('tab', { name: 'Type signature' }));
    expect(screen.getByText('This will be rendered in a cursive font')).toBeInTheDocument();
  });
});
