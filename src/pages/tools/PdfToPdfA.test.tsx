import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToolsStore } from '../../store/toolsStore';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfToPdfA from './PdfToPdfA';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/pdfa', () => ({
  convertToPdfA: vi.fn(async (file: File, level: string) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('PdfToPdfA', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    useToolsStore.setState({ locale: 'en' });
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<PdfToPdfA />);
    expect(screen.getByText(/select a PDF to convert/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<PdfToPdfA />);
    expect(screen.getByRole('heading', { name: /PDF to PDF\/A/i })).toBeInTheDocument();
  });

  it('allows PDF/A level selection', async () => {
    renderWithProviders(<PdfToPdfA />);
    
    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/Select the PDF\/A level to target/i)).toBeInTheDocument();
    });
  });

  it('renders the page in Arabic when that locale is active', () => {
    useToolsStore.setState({ locale: 'ar' });
    renderWithProviders(<PdfToPdfA />);
    expect(screen.getByText(/لم يُتحقق من توافق الناتج/)).toBeInTheDocument();
  });
});
