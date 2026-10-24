import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('renders the copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/LocalPDF Studio/i)).toBeInTheDocument();
  });

  it('states the browser-local and containment boundary', () => {
    render(<Footer />);
    expect(screen.getByText(/Most tools are processed in your browser/i)).toBeInTheDocument();
    expect(
      screen.getByText(/AI, OCR, and camera tools are unavailable in the public beta/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/All processing is done locally/i)).not.toBeInTheDocument();
  });

  it('contains the current year', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
  });
});
