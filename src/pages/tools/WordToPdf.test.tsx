import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordToPdf from './WordToPdf';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyDocx } from '../../tests/fixtures/officeGenerator';

const { convertWordToPdfMock } = vi.hoisted(() => ({
  convertWordToPdfMock: vi.fn(),
}));

vi.mock('../../lib/office-word', () => ({
  convertWordToPdf: convertWordToPdfMock,
}));

describe('WordToPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    convertWordToPdfMock.mockReset();
    convertWordToPdfMock.mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]));
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('renders upload zone on initial load', () => {
      renderWithProviders(<WordToPdf />);
      
      expect(screen.getByText(/select a Word document/i)).toBeInTheDocument();
    });

    it('displays tool title and description', () => {
      renderWithProviders(<WordToPdf />);
      
      expect(screen.getByRole('heading', { name: /WORD to PDF/i })).toBeInTheDocument();
      expect(screen.getByText(/convert DOCX documents to PDF/i)).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('transitions to processing after DOCX selection', async () => {
      renderWithProviders(<WordToPdf />);

      const docxFile = generateDummyDocx('document.docx');
      const input = screen.getByLabelText(/select Word file/i);
      const conversion = createDeferred<Uint8Array>();
      convertWordToPdfMock.mockReturnValueOnce(conversion.promise);

      await user.upload(input, docxFile);

      expect(await screen.findByText(/converting to pdf/i)).toBeInTheDocument();
      expect(convertWordToPdfMock).toHaveBeenCalledWith(docxFile);

      await act(async () => {
        conversion.resolve(new Uint8Array([1, 2, 3, 4, 5]));
        await conversion.promise;
      });

      expect(await screen.findByText(/conversion successful/i)).toBeInTheDocument();
    });

    it('completes conversion successfully', async () => {
      renderWithProviders(<WordToPdf />);
      
      const docxFile = generateDummyDocx('report.docx');
      const input = screen.getByLabelText(/select Word file/i);
      
      await user.upload(input, docxFile);
      
      await waitFor(() => {
        expect(screen.getByText(/Conversion Successful/i)).toBeInTheDocument();
      });
    });

    it('accepts .docx files', () => {
      renderWithProviders(<WordToPdf />);
      
      const input = screen.getByLabelText(/select Word file/i);
      expect(input).toBeInTheDocument();
    });
  });

  describe('Conversion Process', () => {
    it('shows processing state during conversion', async () => {
      renderWithProviders(<WordToPdf />);

      const docxFile = generateDummyDocx('test.docx');
      const input = screen.getByLabelText(/select Word file/i);
      const conversion = createDeferred<Uint8Array>();
      convertWordToPdfMock.mockReturnValueOnce(conversion.promise);

      await user.upload(input, docxFile);

      expect(await screen.findByText(/converting to pdf/i)).toBeInTheDocument();

      await act(async () => {
        conversion.resolve(new Uint8Array([1, 2, 3, 4, 5]));
        await conversion.promise;
      });

      expect(await screen.findByText(/conversion successful/i)).toBeInTheDocument();
    });

    it('shows download state after conversion', async () => {
      renderWithProviders(<WordToPdf />);
      
      const docxFile = generateDummyDocx('test.docx');
      const input = screen.getByLabelText(/select Word file/i);
      
      await user.upload(input, docxFile);
      
      await waitFor(() => {
        expect(screen.getByText(/Conversion Successful/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Download State', () => {
    it('displays download link for PDF file', async () => {
      renderWithProviders(<WordToPdf />);

      const docxFile = generateDummyDocx('test.docx');
      const input = screen.getByLabelText(/select Word file/i);

      await user.upload(input, docxFile);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /download.*\.pdf/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('provides .pdf file for download', async () => {
      renderWithProviders(<WordToPdf />);

      const docxFile = generateDummyDocx('document.docx');
      const input = screen.getByLabelText(/select Word file/i);

      await user.upload(input, docxFile);

      await waitFor(() => {
        expect(screen.getByText(/converted to PDF/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('allows starting over after conversion', async () => {
      renderWithProviders(<WordToPdf />);

      const docxFile = generateDummyDocx('test.docx');
      const input = screen.getByLabelText(/select Word file/i);

      await user.upload(input, docxFile);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByRole('button', { name: /start over/i }));

      await waitFor(() => {
        expect(screen.getByText(/select a Word document/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Type Validation', () => {
    it('handles invalid file types gracefully', async () => {
      renderWithProviders(<WordToPdf />);
      
      // Try uploading a PDF instead of Word
      const invalidFile = new File(['invalid'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/select Word file/i);
      
      await user.upload(input, invalidFile);
      
      // Should show error or stay in upload state
      await waitFor(() => {
        expect(screen.getByText(/select a Word document/i)).toBeInTheDocument();
      });
    });
  });
});
