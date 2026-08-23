import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignPdf from './SignPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/security', () => ({
  signPdf: vi.fn(async (file: File, signature: any) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

vi.mock('../../lib/image', () => ({
  getPdfPageThumbnails: vi.fn(async () => ['data:image/jpeg;base64,mock-thumbnail']),
}));

vi.mock('signature_pad', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      isEmpty: () => false,
      clear: vi.fn(),
      toDataURL: () => 'data:image/png;base64,mock-signature',
      off: vi.fn(),
    })),
  };
});

describe('SignPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<SignPdf />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<SignPdf />);
    expect(screen.getByRole('heading', { name: /sign PDF/i })).toBeInTheDocument();
  });

  it('transitions to signature interface after file upload', async () => {
    renderWithProviders(<SignPdf />);

    const pdfFile = await generateDummyPdf(3, 'contract.pdf');
    const input = screen.getByLabelText(/select PDF file/i);

    await user.upload(input, pdfFile);

    await waitFor(() => {
      // The component shows a "Create Signature" button after loading thumbnails
      expect(screen.getByText(/create signature/i)).toBeInTheDocument();
    });
  });

  it('provides signature input options', async () => {
    renderWithProviders(<SignPdf />);

    const pdfFile = await generateDummyPdf(3, 'contract.pdf');
    const input = screen.getByLabelText(/select PDF file/i);

    await user.upload(input, pdfFile);

    await waitFor(() => {
      // The "Your Signature" sidebar heading + the "Create Signature" button
      // are the input options surfaced after a PDF is loaded.
      expect(
        screen.getByRole('heading', { name: /your signature/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/create signature/i)).toBeInTheDocument();
    });
  });
});