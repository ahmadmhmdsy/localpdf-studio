import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from './Layout';
import { useToolsStore } from '../../store';

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
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    expect(screen.getByText('LocalPDF Studio')).toBeInTheDocument();
    expect(screen.getByText(/All processing is done locally/i)).toBeInTheDocument();
  });

  it('renders the Outlet', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('sets data-theme attribute based on darkMode', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('sets data-theme to dark when darkMode is enabled', () => {
    useToolsStore.setState({ darkMode: true });
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('sets data-skin="glass" by default and renders Header', async () => {
    useToolsStore.setState({ skin: 'glass', hydrated: true });
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    expect(document.documentElement.getAttribute('data-skin')).toBe('glass');
    expect(screen.getByText('LocalPDF Studio')).toBeInTheDocument();
    expect(screen.queryByLabelText('Primary')).toBeNull();
  });

  it('sets data-skin="bento" and renders Sidebar when skin is bento', async () => {
    useToolsStore.setState({ skin: 'bento', hydrated: true });
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    expect(document.documentElement.getAttribute('data-skin')).toBe('bento');
    expect(screen.getByLabelText('Primary')).toBeInTheDocument();
    expect(screen.getByText('All Tools')).toBeInTheDocument();
  });
});
