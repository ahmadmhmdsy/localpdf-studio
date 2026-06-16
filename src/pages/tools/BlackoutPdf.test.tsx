import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlackoutPdf from './BlackoutPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/security', () => ({
  redactPdf: vi.fn(async (file: File, areas: unknown[]) => new Uint8Array([1, 2, 3, 4, 5])),
}));

vi.mock('../../lib/image', () => ({
  getPdfPageThumbnails: vi.fn(async () => ['data:image/png;base64,iVBORw0KGgo=']),
}));

describe('BlackoutPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<BlackoutPdf />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays the "Blackout PDF" tool title', () => {
    renderWithProviders(<BlackoutPdf />);
    expect(screen.getByRole('heading', { name: /blackout PDF/i })).toBeInTheDocument();
  });

  it('shows a warning that pages will be rasterized', () => {
    renderWithProviders(<BlackoutPdf />);
    expect(screen.getByText(/rasterized/i)).toBeInTheDocument();
  });

  it('transitions to blackout interface after file upload', async () => {
    renderWithProviders(<BlackoutPdf />);

    const pdfFile = await generateDummyPdf(3, 'confidential.pdf');
    const input = screen.getByLabelText(/select PDF file/i);

    await user.upload(input, pdfFile);

    await waitFor(() => {
      expect(screen.getByText(/blackouts \(0\)/i)).toBeInTheDocument();
    });
  });
});
