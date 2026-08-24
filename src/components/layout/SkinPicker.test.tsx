import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkinPicker from './SkinPicker';
import { useToolsStore } from '../../store';
import { renderWithProviders } from '../../tests/utils';

describe('SkinPicker', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Reset to default skin before each test.
    useToolsStore.setState({ skin: 'glass', hydrated: true });
  });

  it('renders the trigger button labeled with the current skin', () => {
    renderWithProviders(<SkinPicker />);
    const trigger = screen.getByRole('button', { name: /Change skin/i });
    expect(trigger).toBeInTheDocument();
    // The current label appears inside the trigger button.
    expect(within(trigger).getByText('Glassmorphism')).toBeInTheDocument();
  });

  it('reflects the active skin in its label and aria-label', () => {
    useToolsStore.setState({ skin: 'bento' });
    renderWithProviders(<SkinPicker />);
    const trigger = screen.getByRole('button', { name: /current: Bento/i });
    expect(within(trigger).getByText('Bento')).toBeInTheDocument();
  });

  it('does not render the menu initially', () => {
    renderWithProviders(<SkinPicker />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu when the trigger is clicked', async () => {
    renderWithProviders(<SkinPicker />);
    const trigger = screen.getByRole('button', { name: /Change skin/i });
    await user.click(trigger);
    const menu = screen.getByRole('menu', { name: /Choose a skin/i });
    expect(menu).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('lists every registered skin in the menu with aria-pressed', async () => {
    renderWithProviders(<SkinPicker />);
    await user.click(screen.getByRole('button', { name: /Change skin/i }));

    const glass = screen.getByTestId('skin-picker-option-glass');
    const bento = screen.getByTestId('skin-picker-option-bento');

    expect(glass).toBeInTheDocument();
    expect(bento).toBeInTheDocument();
    expect(glass).toHaveAttribute('aria-pressed', 'true');
    expect(bento).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking an option calls setSkin, closes the menu, and updates the label', async () => {
    renderWithProviders(<SkinPicker />);
    await user.click(screen.getByRole('button', { name: /Change skin/i }));
    const bento = screen.getByTestId('skin-picker-option-bento');
    await user.click(bento);

    // Menu closed.
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Store updated.
    expect(useToolsStore.getState().skin).toBe('bento');

    // Trigger label updated.
    const trigger = screen.getByRole('button', { name: /current: Bento/i });
    expect(within(trigger).getByText('Bento')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles the menu closed when the trigger is clicked twice', async () => {
    renderWithProviders(<SkinPicker />);
    const trigger = screen.getByRole('button', { name: /Change skin/i });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu when Escape is pressed', async () => {
    renderWithProviders(<SkinPicker />);
    await user.click(screen.getByRole('button', { name: /Change skin/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu when clicking outside the picker', async () => {
    render(
      <div>
        <SkinPicker />
        <button data-testid="outside">Outside</button>
      </div>
    );
    await user.click(screen.getByRole('button', { name: /Change skin/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click on the outside button — the mousedown listener should close the menu.
    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does NOT close when clicking inside the menu', async () => {
    renderWithProviders(<SkinPicker />);
    await user.click(screen.getByRole('button', { name: /Change skin/i }));
    const menu = screen.getByRole('menu');
    // Clicking on the menu itself (not a button) should keep it open.
    fireEvent.mouseDown(menu);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows a hint per option', async () => {
    renderWithProviders(<SkinPicker />);
    await user.click(screen.getByRole('button', { name: /Change skin/i }));
    expect(screen.getByText(/Floating pill/i)).toBeInTheDocument();
    expect(screen.getByText(/Sidebar nav/i)).toBeInTheDocument();
  });
});
