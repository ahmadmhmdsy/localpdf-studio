import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('renders the copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/LocalPDF Studio/i)).toBeInTheDocument();
  });

  it('mentions local processing', () => {
    render(<Footer />);
    expect(screen.getByText(/All processing is done locally/i)).toBeInTheDocument();
  });

  it('contains the current year', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
  });
});
