import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfToExcel from './PdfToExcel';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/pdf-to-excel', () => ({
  convertPdfToExcel: vi.fn(async (file: File) => {
    await new Promise(r => setTimeout(r, 200));
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('PdfToExcel', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<PdfToExcel />);
    expect(screen.getByText(/select a PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<PdfToExcel />);
    expect(screen.getByRole('heading', { name: /PDF to EXCEL/i })).toBeInTheDocument();
  });

  it('transitions to processing after file upload', async () => {
    renderWithProviders(<PdfToExcel />);
    
    const pdfFile = await generateDummyPdf(3, 'tables.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/extracting tables/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
