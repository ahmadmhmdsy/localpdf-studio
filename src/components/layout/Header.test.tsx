import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Header', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders the app title', () => {
    renderWithRouter(<Header />);
    expect(screen.getByText('LocalPDF Studio')).toBeInTheDocument();
  });

  it('has a link to the home page', () => {
    renderWithRouter(<Header />);
    const homeLink = screen.getByRole('link', { name: /LocalPDF Studio/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('has a Visual Editor link', () => {
    renderWithRouter(<Header />);
    expect(screen.getByRole('link', { name: /Visual Editor/i })).toHaveAttribute('href', '/editor');
  });

  it('has a Merge PDF link', () => {
    renderWithRouter(<Header />);
    expect(screen.getByRole('link', { name: /Merge PDF/i })).toHaveAttribute('href', '/tools/merge-pdf');
  });

  it('has a Split PDF link', () => {
    renderWithRouter(<Header />);
    expect(screen.getByRole('link', { name: /Split PDF/i })).toHaveAttribute('href', '/tools/split-pdf');
  });

  it('has an All PDF Tools link', () => {
    renderWithRouter(<Header />);
    expect(screen.getByRole('link', { name: /All PDF Tools/i })).toHaveAttribute('href', '/');
  });

  // ----- Mobile drawer -----

  it('renders a hamburger menu button', () => {
    renderWithRouter(<Header />);
    const menuBtn = screen.getByRole('button', { name: /Open menu/i });
    expect(menuBtn).toBeInTheDocument();
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    expect(menuBtn).toHaveAttribute('aria-controls', 'mobile-nav');
  });

  it('does not render the drawer initially', () => {
    renderWithRouter(<Header />);
    expect(screen.queryByRole('dialog', { name: /Site navigation/i })).not.toBeInTheDocument();
  });

  it('opens the drawer when the menu button is clicked', async () => {
    renderWithRouter(<Header />);
    const menuBtn = screen.getByRole('button', { name: /Open menu/i });
    await user.click(menuBtn);
    const drawer = screen.getByRole('dialog', { name: /Site navigation/i });
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('drawer contains all navigation links', async () => {
    renderWithRouter(<Header />);
    await user.click(screen.getByRole('button', { name: /Open menu/i }));
    // Each link should be present in the drawer.
    expect(screen.getAllByRole('link', { name: /Visual Editor/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /Merge PDF/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /Split PDF/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /PDF to JPG/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /JPG to PDF/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /All PDF Tools/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('closes the drawer when close button is clicked', async () => {
    renderWithRouter(<Header />);
    await user.click(screen.getByRole('button', { name: /Open menu/i }));
    expect(screen.getByRole('dialog', { name: /Site navigation/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Close menu/i }));
    expect(screen.queryByRole('dialog', { name: /Site navigation/i })).not.toBeInTheDocument();
  });

  it('closes the drawer when a link inside the drawer is clicked', async () => {
    renderWithRouter(<Header />);
    await user.click(screen.getByRole('button', { name: /Open menu/i }));
    const drawer = screen.getByRole('dialog', { name: /Site navigation/i });
    // Click a link that only exists in the drawer (JPG to PDF is in nav links but not in a unique desktop location).
    // The first matching link belongs to the desktop nav (hidden via md:flex), so we grab the drawer copy.
    const drawerLink = drawer.querySelector('a[href="/tools/merge-pdf"]');
    expect(drawerLink).not.toBeNull();
    await user.click(drawerLink as HTMLElement);
    expect(screen.queryByRole('dialog', { name: /Site navigation/i })).not.toBeInTheDocument();
  });
});