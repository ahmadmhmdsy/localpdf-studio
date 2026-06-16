import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiSummarizer from './AiSummarizer';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/ai', () => ({
  extractPdfText: vi.fn(async (file: File, onProgress?: (page: number, total: number) => void) => {
    await new Promise(r => setTimeout(r, 200));
    return 'Extracted text content from PDF.';
  }),
  summarizePdf: vi.fn(async (text: string, onProgress?: (chunk: number, total: number) => void) => {
    await new Promise(r => setTimeout(r, 200));
    return 'This is a test summary of the PDF document.';
  }),
}));

describe('AiSummarizer', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<AiSummarizer />);
    expect(screen.getByText(/select a PDF to summarize/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<AiSummarizer />);
    expect(screen.getByRole('heading', { name: /AI Summarizer/i })).toBeInTheDocument();
  });

  it('transitions to processing after file upload', async () => {
    renderWithProviders(<AiSummarizer />);
    
    const pdfFile = await generateDummyPdf(3, 'document.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/extracting text/i)).toBeInTheDocument();
    });
  });

  it('shows AI processing indicator', async () => {
    renderWithProviders(<AiSummarizer />);
    
    const pdfFile = await generateDummyPdf(3, 'document.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/extracting text/i)).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/generating summary/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays summary results', async () => {
    renderWithProviders(<AiSummarizer />);
    
    const pdfFile = await generateDummyPdf(3, 'document.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/AI Summary Generated/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
