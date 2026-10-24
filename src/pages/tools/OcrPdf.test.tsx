import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OcrPdf from './OcrPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';
import { ocrPdf, OcrCancelledError, OcrLimitError } from '../../lib/ocr';
import { InvalidPageRangeError } from '../../lib/pdf';

vi.mock('../../lib/ocr', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/ocr')>();
  return {
    ...actual,
    ocrPdf: vi.fn(async () => ({
      bytes: new Uint8Array([1, 2, 3, 4, 5]),
      pagesRecognized: 2,
      pagesSkipped: 1,
      wordsAdded: 42,
      charactersDropped: 0,
    })),
  };
});

describe('OcrPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  async function uploadPdf() {
    const pdfFile = await generateDummyPdf(3, 'scanned.pdf');
    await user.upload(screen.getByLabelText(/select PDF file/i), pdfFile);
  }

  it('renders upload zone on initial load', () => {
    renderWithProviders(<OcrPdf />);
    expect(screen.getByText(/select a scanned PDF/i)).toBeInTheDocument();
  });

  it('displays tool title without claiming AI', () => {
    renderWithProviders(<OcrPdf />);
    expect(screen.getByRole('heading', { name: /OCR PDF/i })).toBeInTheDocument();
    expect(screen.queryByText(/\bAI\b/)).not.toBeInTheDocument();
  });

  it('asks for the document language before starting', async () => {
    renderWithProviders(<OcrPdf />);
    await uploadPdf();

    expect(await screen.findByLabelText(/document language/i)).toHaveValue('eng');
    expect(ocrPdf).not.toHaveBeenCalled();
  });

  it('runs OCR with the chosen language and shows the summary', async () => {
    renderWithProviders(<OcrPdf />);
    await uploadPdf();

    await user.selectOptions(await screen.findByLabelText(/document language/i), 'fra');
    await user.click(screen.getByRole('button', { name: /recognize text/i }));

    await waitFor(() => expect(screen.getByText(/OCR Complete/i)).toBeInTheDocument());
    expect(vi.mocked(ocrPdf).mock.calls[0][1]).toMatchObject({ language: 'fra' });
    expect(screen.getByText(/42 words added on 2 page\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/1 page\(s\) already had text/)).toBeInTheDocument();
  });

  it('explains when the language data is missing', async () => {
    const { OcrLanguageDataMissingError } = await import('../../lib/ocr');
    vi.mocked(ocrPdf).mockRejectedValueOnce(new OcrLanguageDataMissingError('English'));
    renderWithProviders(<OcrPdf />);
    await uploadPdf();

    await user.click(await screen.findByRole('button', { name: /recognize text/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/English OCR language data is not included/);
  });

  it('passes the page range to OCR', async () => {
    renderWithProviders(<OcrPdf />);
    await uploadPdf();

    await user.type(await screen.findByLabelText(/pages \(optional\)/i), '1-2');
    await user.click(screen.getByRole('button', { name: /recognize text/i }));

    await waitFor(() => expect(screen.getByText(/OCR Complete/i)).toBeInTheDocument());
    expect(vi.mocked(ocrPdf).mock.calls[0][1]).toMatchObject({ pageRange: '1-2' });
  });

  it('shows an invalid range next to the input and keeps the settings', async () => {
    vi.mocked(ocrPdf).mockRejectedValueOnce(new InvalidPageRangeError('Page 9 is out of range.', '9'));
    renderWithProviders(<OcrPdf />);
    await uploadPdf();

    const input = await screen.findByLabelText(/pages \(optional\)/i);
    await user.type(input, '9');
    await user.click(screen.getByRole('button', { name: /recognize text/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Page 9 is out of range.');
    expect(screen.getByLabelText(/pages \(optional\)/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/pages \(optional\)/i)).toHaveValue('9');

    await user.type(screen.getByLabelText(/pages \(optional\)/i), ',1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the page and size limits before starting', async () => {
    renderWithProviders(<OcrPdf />);
    await uploadPdf();

    expect(await screen.findByText(/up to 200 pages and 50 MB per file/i)).toBeInTheDocument();
  });

  it('cancels a running job and returns to the settings', async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(ocrPdf).mockImplementationOnce(async (_file, options) => {
      signal = options?.signal;
      return new Promise((_, reject) => {
        signal?.addEventListener('abort', () => reject(new OcrCancelledError()));
      });
    });
    renderWithProviders(<OcrPdf />);
    await uploadPdf();

    await user.click(await screen.findByRole('button', { name: /recognize text/i }));
    await user.click(await screen.findByRole('button', { name: /^cancel$/i }));

    expect(signal?.aborted).toBe(true);
    expect(await screen.findByRole('button', { name: /recognize text/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the limit message when a file is too large', async () => {
    vi.mocked(ocrPdf).mockRejectedValueOnce(new OcrLimitError('This PDF has 500 pages; OCR is limited to 200.'));
    renderWithProviders(<OcrPdf />);
    await uploadPdf();

    await user.click(await screen.findByRole('button', { name: /recognize text/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/500 pages; OCR is limited to 200/);
  });
});
