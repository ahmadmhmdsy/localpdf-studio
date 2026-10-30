import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToolsStore } from '../../store/toolsStore';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiSummarizer from './AiSummarizer';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

const { extractPdfTextMock, summarizePdfMock } = vi.hoisted(() => ({
  extractPdfTextMock: vi.fn(),
  summarizePdfMock: vi.fn(),
}));

vi.mock('../../lib/ai', () => ({
  extractPdfText: extractPdfTextMock,
  summarizePdf: summarizePdfMock,
}));

vi.mock('../../store', () => ({
  useToolsStore: (selector: (state: { aiConsentGiven: boolean; setAiConsentGiven: (v: boolean) => void }) => unknown) =>
    selector({ aiConsentGiven: true, setAiConsentGiven: vi.fn() }),
}));

describe('AiSummarizer', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    useToolsStore.setState({ locale: 'en' });
    user = userEvent.setup();
    extractPdfTextMock.mockReset();
    extractPdfTextMock.mockResolvedValue('Extracted text content from PDF.');
    summarizePdfMock.mockReset();
    summarizePdfMock.mockResolvedValue('This is a test summary of the PDF document.');
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
    const extraction = createDeferred<string>();
    extractPdfTextMock.mockReturnValueOnce(extraction.promise);

    await user.upload(input, pdfFile);

    expect(await screen.findByText(/extracting text/i)).toBeInTheDocument();
    expect(extractPdfTextMock).toHaveBeenCalledWith(pdfFile, expect.any(Function));

    await act(async () => {
      extraction.resolve('Extracted text content from PDF.');
      await extraction.promise;
    });

    expect(await screen.findByText(/AI Summary Generated/i)).toBeInTheDocument();
  });

  it('shows each AI processing stage before completion', async () => {
    renderWithProviders(<AiSummarizer />);

    const pdfFile = await generateDummyPdf(3, 'document.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    const extraction = createDeferred<string>();
    const summarization = createDeferred<string>();
    extractPdfTextMock.mockReturnValueOnce(extraction.promise);
    summarizePdfMock.mockReturnValueOnce(summarization.promise);

    await user.upload(input, pdfFile);

    expect(await screen.findByText(/extracting text/i)).toBeInTheDocument();

    await act(async () => {
      extraction.resolve('Extracted text content from PDF.');
      await extraction.promise;
    });

    expect(await screen.findByText(/generating summary/i)).toBeInTheDocument();
    expect(summarizePdfMock).toHaveBeenCalledWith(
      'Extracted text content from PDF.',
      expect.any(Function)
    );

    await act(async () => {
      summarization.resolve('This is a test summary of the PDF document.');
      await summarization.promise;
    });

    expect(await screen.findByText(/AI Summary Generated/i)).toBeInTheDocument();
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

  it('renders the page in Arabic when that locale is active', () => {
    useToolsStore.setState({ locale: 'ar' });
    renderWithProviders(<AiSummarizer />);
    expect(screen.getByText('اختر ملف PDF لتلخيصه')).toBeInTheDocument();
  });
});
