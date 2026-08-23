import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfToWord from './PdfToWord';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

// Mock Word conversion library
vi.mock('../../lib/pdf-to-word', () => ({
  convertPdfToWord: vi.fn(async (file: File) => {
    await new Promise(r => setTimeout(r, 10));
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('PdfToWord', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('renders upload zone on initial load', () => {
      renderWithProviders(<PdfToWord />);
      
      expect(screen.getByText(/select a PDF file/i)).toBeInTheDocument();
    });

    it('displays tool title and description', () => {
      renderWithProviders(<PdfToWord />);
      
      expect(screen.getByRole('heading', { name: /PDF to WORD/i })).toBeInTheDocument();
      expect(screen.getByText(/convert PDF files to editable Word/i)).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('transitions to processing after file selection', async () => {
      renderWithProviders(<PdfToWord />);

      const pdfFile = await generateDummyPdf(3, 'document.pdf');
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);

      await waitFor(() => {
        const processing = screen.queryByText(/converting to word/i);
        const success = screen.queryByText(/Conversion Successful/i);
        expect(processing || success).toBeInTheDocument();
      });
    });

    it('completes conversion successfully', async () => {
      renderWithProviders(<PdfToWord />);

      const pdfFile = await generateDummyPdf(3, 'report.pdf');
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);

      await waitFor(() => {
        expect(screen.getByText(/Conversion Successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('Conversion Process', () => {
    it('shows processing state during conversion', async () => {
      renderWithProviders(<PdfToWord />);

      const pdfFile = await generateDummyPdf(3, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);

      await waitFor(() => {
        const processing = screen.queryByText(/converting to word/i);
        const success = screen.queryByText(/Conversion Successful/i);
        expect(processing || success).toBeInTheDocument();
      });
    });

    it('shows download state after conversion', async () => {
      renderWithProviders(<PdfToWord />);
      
      const pdfFile = await generateDummyPdf(3, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByText(/Conversion Successful/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Download State', () => {
    it('displays download link for DOCX file', async () => {
      renderWithProviders(<PdfToWord />);

      const pdfFile = await generateDummyPdf(3, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /download.*\.docx/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('provides .docx file for download', async () => {
      renderWithProviders(<PdfToWord />);

      const pdfFile = await generateDummyPdf(3, 'document.pdf');
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);

      await waitFor(() => {
        expect(screen.getByText(/converted to Word/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('allows starting over after conversion', async () => {
      renderWithProviders(<PdfToWord />);

      const pdfFile = await generateDummyPdf(3, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
