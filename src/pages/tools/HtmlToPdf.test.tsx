import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HtmlToPdf from './HtmlToPdf';
import { renderWithProviders } from '../../tests/utils';

vi.mock('../../lib/pdf', () => ({
  htmlToPdf: vi.fn(async (html: string) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('HtmlToPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders HTML input on initial load', () => {
    renderWithProviders(<HtmlToPdf />);
    expect(screen.getByPlaceholderText(/Your HTML here/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<HtmlToPdf />);
    expect(screen.getByRole('heading', { name: /HTML to PDF/i })).toBeInTheDocument();
  });

  it('does not offer a URL input mode (it was dead code)', () => {
    renderWithProviders(<HtmlToPdf />);
    expect(screen.queryByRole('button', { name: /web url/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/https:\/\/example\.com/i)).not.toBeInTheDocument();
  });

  it('allows HTML content input', async () => {
    renderWithProviders(<HtmlToPdf />);

    const textarea = screen.getByPlaceholderText(/Your HTML here/i);
    await user.clear(textarea);
    await user.type(textarea, '<h1>Test</h1>');

    expect(textarea).toHaveValue('<h1>Test</h1>');
  });
});
