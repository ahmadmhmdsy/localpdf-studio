import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Header', () => {
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
});
