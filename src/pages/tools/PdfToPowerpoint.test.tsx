import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfToPowerpoint from './PdfToPowerpoint';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/pdf-to-pptx', () => ({
  convertPdfToPowerpoint: vi.fn(async (file: File) => {
    await new Promise(r => setTimeout(r, 200));
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('PdfToPowerpoint', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<PdfToPowerpoint />);
    expect(screen.getByText(/select a PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<PdfToPowerpoint />);
    expect(screen.getByRole('heading', { name: /PDF to POWERPOINT/i })).toBeInTheDocument();
  });

  it('transitions to processing after file upload', async () => {
    renderWithProviders(<PdfToPowerpoint />);
    
    const pdfFile = await generateDummyPdf(5, 'slides.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/creating presentation/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
