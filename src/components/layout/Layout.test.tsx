import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from './Layout';
import { useToolsStore } from '../../store';
import { renderWithProviders } from '../../tests/utils';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  };
});

describe('Layout', () => {
  beforeEach(() => {
    useToolsStore.setState({ darkMode: false });
  });

  it('renders Header and Footer', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText('LocalPDF Studio')).toBeInTheDocument();
    expect(screen.getByText(/Most tools are processed in your browser/i)).toBeInTheDocument();
  });

  it('renders the Outlet', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('sets data-theme attribute based on darkMode', () => {
    renderWithProviders(<Layout />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('sets data-theme to dark when darkMode is enabled', () => {
    useToolsStore.setState({ darkMode: true });
    renderWithProviders(<Layout />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('sets data-skin="glass" by default and renders Header', async () => {
    useToolsStore.setState({ skin: 'glass', hydrated: true });
    renderWithProviders(<Layout />);
    expect(document.documentElement.getAttribute('data-skin')).toBe('glass');
    expect(screen.getByText('LocalPDF Studio')).toBeInTheDocument();
    expect(screen.queryByLabelText('Primary')).toBeNull();
  });

  it('sets data-skin="bento" and renders Sidebar when skin is bento', async () => {
    useToolsStore.setState({ skin: 'bento', hydrated: true });
    renderWithProviders(<Layout />);
    expect(document.documentElement.getAttribute('data-skin')).toBe('bento');
    expect(screen.getByLabelText('Primary')).toBeInTheDocument();
    expect(screen.getByText('All Tools')).toBeInTheDocument();
  });
});
