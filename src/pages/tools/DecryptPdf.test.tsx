import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DecryptPdf from './DecryptPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateProtectedPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/encryption', () => ({
  unlockPdf: vi.fn(async (file: File, password: string) => new Uint8Array([1, 2, 3, 4, 5])),
}));

describe('DecryptPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<DecryptPdf />);
    expect(screen.getByText(/select an encrypted PDF/i)).toBeInTheDocument();
  });

  it('displays the "Decrypt PDF" tool title', () => {
    renderWithProviders(<DecryptPdf />);
    expect(screen.getByRole('heading', { name: /decrypt PDF/i })).toBeInTheDocument();
  });

  it('transitions to password input after file upload', async () => {
    renderWithProviders(<DecryptPdf />);

    const pdfFile = await generateProtectedPdf('secret123');
    const input = screen.getByLabelText(/select encrypted PDF/i);

    await user.upload(input, pdfFile);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
    });
  });

  it('accepts password input', async () => {
    renderWithProviders(<DecryptPdf />);

    const pdfFile = await generateProtectedPdf('secret123');
    const input = screen.getByLabelText(/select encrypted PDF/i);

    await user.upload(input, pdfFile);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText(/enter password/i);
    await user.type(passwordInput, 'secret123');
    expect(passwordInput).toHaveValue('secret123');
  });
});
