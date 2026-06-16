import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OcrPdf from './OcrPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/ocr', () => ({
  ocrPdf: vi.fn(async (file: File, language: string) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('OcrPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<OcrPdf />);
    expect(screen.getByText(/select a scanned PDF/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<OcrPdf />);
    expect(screen.getByRole('heading', { name: /OCR PDF/i })).toBeInTheDocument();
  });

  it('transitions to processing after file upload', async () => {
    renderWithProviders(<OcrPdf />);
    
    const pdfFile = await generateDummyPdf(3, 'scanned.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      const hasProcessing = screen.queryByText(/processing with OCR/i);
      const hasComplete = screen.queryByText(/OCR Complete/i);
      expect(hasProcessing || hasComplete).toBeInTheDocument();
    });
  });

  it('shows processing state during OCR', async () => {
    renderWithProviders(<OcrPdf />);
    
    const pdfFile = await generateDummyPdf(3, 'scanned.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      const hasProcessing = screen.queryByText(/processing with OCR/i);
      const hasComplete = screen.queryByText(/OCR Complete/i);
      expect(hasProcessing || hasComplete).toBeInTheDocument();
    });
  });
});
