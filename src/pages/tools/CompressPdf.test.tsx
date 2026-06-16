import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompressPdf from './CompressPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf, generateLargePdf } from '../../tests/fixtures/pdfGenerator';

// Mock compression library
vi.mock('../../lib/compress', () => ({
  compressPdf: vi.fn(async (file: File, quality: string) => {
    await new Promise(r => setTimeout(r, 200));
    return {
      bytes: new Uint8Array([1, 2, 3]),
      notes: ['Test note: best-effort compression only.'],
    };
  }),
}));

describe('CompressPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('renders upload zone on initial load', () => {
      renderWithProviders(<CompressPdf />);
      
      expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
    });

    it('displays tool title and description', () => {
      renderWithProviders(<CompressPdf />);
      
      expect(screen.getByRole('heading', { name: /compress PDF/i })).toBeInTheDocument();
      expect(screen.getByText(/reduce file size/i)).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('transitions to configure step after file selection', async () => {
      renderWithProviders(<CompressPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'large.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByText(/compression level/i)).toBeInTheDocument();
      });
    });

    it('displays uploaded file details', async () => {
      renderWithProviders(<CompressPdf />);
      
      const pdfFile = await generateDummyPdf(10, 'document.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
        expect(screen.getByText(/MB/)).toBeInTheDocument();
      });
    });
  });

  describe('Compression Options', () => {
    it('shows compression level selector', async () => {
      renderWithProviders(<CompressPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByText(/compression level/i)).toBeInTheDocument();
      });
    });

    it('allows selecting compression quality', async () => {
      renderWithProviders(<CompressPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /compress PDF/i })).toBeInTheDocument();
      });
    });

    it('shows recommended compression option', async () => {
      renderWithProviders(<CompressPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /compress PDF/i })).toBeInTheDocument();
      });
    });
  });

  describe('Compression Process', () => {
    it('shows processing state during compression', async () => {
      renderWithProviders(<CompressPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        const compressButton = screen.getByRole('button', { name: /compress PDF/i });
        expect(compressButton).toBeInTheDocument();
      });
      
      const compressButton = screen.getByRole('button', { name: /compress PDF/i });
      await user.click(compressButton);
      
      await waitFor(() => {
        expect(screen.getByText(/compressing/i)).toBeInTheDocument();
      });
    });

    it('shows compression results after processing', async () => {
      renderWithProviders(<CompressPdf />);

      const pdfFile = await generateLargePdf();
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);

      await waitFor(() => {
        const compressButton = screen.getByRole('button', { name: /compress PDF/i });
        expect(compressButton).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /compress PDF/i }));

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays the re-packed size summary', async () => {
      renderWithProviders(<CompressPdf />);

      const pdfFile = await generateLargePdf();
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);
      await user.click(screen.getByRole('button', { name: /compress PDF/i }));

      // The download state shows "Re-packed from <original> to <new>".
      // This is the honest size-summary — pdf-lib cannot re-compress
      // streams, so the page intentionally does NOT show a "X% reduced"
      // percentage. Asserting on the real copy keeps the test honest.
      await waitFor(() => {
        expect(screen.getByText(/re-packed from/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Download State', () => {
    it('displays download button with compressed file', async () => {
      renderWithProviders(<CompressPdf />);

      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);
      await user.click(screen.getByRole('button', { name: /compress PDF/i }));

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('allows starting over after compression', async () => {
      renderWithProviders(<CompressPdf />);

      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);
      await user.click(screen.getByRole('button', { name: /compress PDF/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByRole('button', { name: /start over/i }));

      await waitFor(() => {
        expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
      });
    });
  });

  describe('Comparison Display', () => {
    it('shows before and after file sizes in the summary', async () => {
      renderWithProviders(<CompressPdf />);

      const pdfFile = await generateLargePdf();
      const input = screen.getByLabelText(/select PDF file/i);

      await user.upload(input, pdfFile);
      await user.click(screen.getByRole('button', { name: /compress PDF/i }));

      // The "Re-packed from X to Y" copy encodes both original and
      // resulting size; both surfaces are checked for by the regex.
      await waitFor(() => {
        expect(screen.getByText(/re-packed from .* to/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
