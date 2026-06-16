import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

describe('KeyboardShortcutsHelp', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<KeyboardShortcutsHelp isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });

  it('displays Undo & Redo shortcuts', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Undo & Redo')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Z')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Shift+Z')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Y')).toBeInTheDocument();
  });

  it('displays Editing shortcuts', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Editing')).toBeInTheDocument();
    expect(screen.getByText('Delete / Backspace')).toBeInTheDocument();
  });

  it('displays Zoom shortcuts', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Zoom')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+= / Ctrl++')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+-')).toBeInTheDocument();
  });

  it('displays Tools shortcuts', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('I')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
    await user.click(screen.getByLabelText('Close shortcuts'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Close button clicked', async () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
    await user.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('has correct ARIA attributes', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Keyboard shortcuts');
  });

  it('displays hint about ? key', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders shortcut descriptions', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
    expect(screen.getByText('Redo (alternative)')).toBeInTheDocument();
    expect(screen.getByText('Delete selected annotation')).toBeInTheDocument();
    expect(screen.getByText('Zoom in')).toBeInTheDocument();
    expect(screen.getByText('Zoom out')).toBeInTheDocument();
    expect(screen.getByText('Select tool')).toBeInTheDocument();
    expect(screen.getByText('Pan tool')).toBeInTheDocument();
    expect(screen.getByText('Text tool')).toBeInTheDocument();
    expect(screen.getByText('Draw tool')).toBeInTheDocument();
    expect(screen.getByText('Image tool')).toBeInTheDocument();
    expect(screen.getByText('Redact tool')).toBeInTheDocument();
    expect(screen.getByText('Crop tool')).toBeInTheDocument();
    expect(screen.getByText('Signature tool')).toBeInTheDocument();
  });
});
