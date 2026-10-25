import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfToJpg from './PdfToJpg';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

const { pdfToJpgsMock } = vi.hoisted(() => ({
  pdfToJpgsMock: vi.fn(),
}));

vi.mock('../../lib/image', () => ({
  pdfToJpgs: pdfToJpgsMock,
}));

vi.mock('jszip', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      file: vi.fn(),
      generateAsync: vi.fn().mockResolvedValue(new Blob(['zip'])),
    })),
  };
});

describe('PdfToJpg', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    pdfToJpgsMock.mockReset();
    pdfToJpgsMock.mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }));
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('renders upload zone on initial load', () => {
      renderWithProviders(<PdfToJpg />);
      
      expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
    });

    it('displays tool title and description', () => {
      renderWithProviders(<PdfToJpg />);
      
      expect(screen.getByRole('heading', { name: /PDF to JPG/i })).toBeInTheDocument();
      expect(screen.getByText(/render every PDF page as a JPG/i)).toBeInTheDocument();
    });
  });

  describe('PDF Upload', () => {
    it('transitions to configure step after file selection', async () => {
      renderWithProviders(<PdfToJpg />);
      
      const pdfFile = await generateDummyPdf(3, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByText(/convert to jpg/i)).toBeInTheDocument();
      });
    });

    it('displays PDF details in configure step', async () => {
      renderWithProviders(<PdfToJpg />);
      
      const pdfFile = await generateDummyPdf(3, 'document.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
      });
    });
  });

  describe('Extraction Options', () => {
    it('shows extraction options', async () => {
      renderWithProviders(<PdfToJpg />);
      
      const pdfFile = await generateDummyPdf(3, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /convert to jpg/i })).toBeInTheDocument();
      });
    });

    it('allows selecting image quality options', async () => {
      renderWithProviders(<PdfToJpg />);
      
      const pdfFile = await generateDummyPdf(3, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByText(/convert to jpg/i)).toBeInTheDocument();
      });
    });
  });

  describe('Extraction Process', () => {
    it('shows processing and completes when extraction resolves', async () => {
      renderWithProviders(<PdfToJpg />);

      const pdfFile = await generateDummyPdf(3, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      const extraction = createDeferred<Blob>();
      const resultBlob = new Blob(['zip'], { type: 'application/zip' });
      pdfToJpgsMock.mockReturnValueOnce(extraction.promise);

      await user.upload(input, pdfFile);

      const extractButton = await screen.findByRole('button', { name: /convert to jpg/i });
      await user.click(extractButton);

      expect(await screen.findByText(/converting pdf to jpg/i)).toBeInTheDocument();
      expect(pdfToJpgsMock).toHaveBeenCalledWith(pdfFile);

      await act(async () => {
        extraction.resolve(resultBlob);
        await extraction.promise;
      });

      expect(
        await screen.findByRole('link', { name: /download test_jpgs\.zip/i })
      ).toHaveAttribute('href', 'mock-url');
    });

    it('shows download state after extraction', async () => {
      renderWithProviders(<PdfToJpg />);
      
      const pdfFile = await generateDummyPdf(2, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        const extractButton = screen.getByRole('button', { name: /convert to jpg/i });
        expect(extractButton).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /convert to jpg/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/pdf converted successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows zip download option for multiple images', async () => {
      renderWithProviders(<PdfToJpg />);
      
      const pdfFile = await generateDummyPdf(3, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        const extractButton = screen.getByRole('button', { name: /convert to jpg/i });
        expect(extractButton).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /convert to jpg/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /jpgs\.zip/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Download Options', () => {
    it('provides individual image download', async () => {
      renderWithProviders(<PdfToJpg />);
      
      const pdfFile = await generateDummyPdf(2, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      await user.click(screen.getByRole('button', { name: /convert to jpg/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
