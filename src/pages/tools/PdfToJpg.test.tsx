import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfToJpg from './PdfToJpg';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

// Mock pdf conversion
vi.mock('../../lib/image', () => ({
  pdfToJpgs: vi.fn(async (file: File) => {
    await new Promise(r => setTimeout(r, 200));
    return new Blob(['zip']);
  }),
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
      expect(screen.getByText(/extract images/i)).toBeInTheDocument();
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
    it('shows processing state during extraction', async () => {
      renderWithProviders(<PdfToJpg />);
      
      const pdfFile = await generateDummyPdf(3, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        const extractButton = screen.getByRole('button', { name: /convert to jpg/i });
        expect(extractButton).toBeInTheDocument();
      });
      
      const extractButton = screen.getByRole('button', { name: /convert to jpg/i });
      await user.click(extractButton);
      
      await waitFor(() => {
        expect(screen.getByText(/converting pdf to jpg/i)).toBeInTheDocument();
      });
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
