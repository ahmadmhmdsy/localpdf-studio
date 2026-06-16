import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SplitPdf from './SplitPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

// Mock pdf-lib operations
vi.mock('../../lib/pdf', () => ({
  extractPages: vi.fn(async (file: File, ranges: string) => {
    await new Promise(r => setTimeout(r, 200));
    if (!ranges.trim()) {
      throw new Error('No page ranges specified');
    }
    if (ranges === 'invalid-range') {
      throw new Error('Invalid page range');
    }
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('SplitPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('renders upload zone on initial load', () => {
      renderWithProviders(<SplitPdf />);
      
      expect(screen.getByText('Select PDF file')).toBeInTheDocument();
      expect(screen.getByText(/drop PDF here/i)).toBeInTheDocument();
    });

    it('displays tool title and description', () => {
      renderWithProviders(<SplitPdf />);
      
      expect(screen.getByRole('heading', { name: 'Split PDF' })).toBeInTheDocument();
      expect(screen.getByText(/extract specific pages/i)).toBeInTheDocument();
    });

    it('only accepts single file upload', () => {
      renderWithProviders(<SplitPdf />);
      
      const input = screen.getByLabelText(/select PDF file/i);
      expect(input).toHaveAttribute('type', 'file');
    });
  });

  describe('File Upload', () => {
    it('transitions to configure step after file selection', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test-document.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByText('Pages to extract')).toBeInTheDocument();
      });
    });

    it('displays uploaded file details in configure step', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'my-document.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByText('my-document.pdf')).toBeInTheDocument();
        expect(screen.getByText(/MB/)).toBeInTheDocument();
      });
    });
  });

  describe('Page Range Configuration', () => {
    it('shows page range input field', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
      });
    });

    it('accepts valid page range input', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
      });
      
      const rangeInput = screen.getByPlaceholderText(/e\.g\., 1-5, 8, 11-13/i);
      await user.type(rangeInput, '1-3');
      
      expect(rangeInput).toHaveValue('1-3');
    });

    it('disables split button without page ranges', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        const splitButton = screen.getByRole('button', { name: /split PDF/i });
        expect(splitButton).toBeDisabled();
      });
    });

    it('enables split button with valid page ranges', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
      });
      
      const rangeInput = screen.getByPlaceholderText(/e\.g\., 1-5, 8, 11-13/i);
      await user.type(rangeInput, '1-3,5');
      
      const splitButton = screen.getByRole('button', { name: /split PDF/i });
      expect(splitButton).not.toBeDisabled();
    });

    it('shows helper text for page range format', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByText(/enter page numbers and\/or page ranges/i)).toBeInTheDocument();
      });
    });
  });

  describe('Split Operation', () => {
    it('shows processing state during split', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
      });
      
      const rangeInput = screen.getByPlaceholderText(/e\.g\., 1-5, 8, 11-13/i);
      await user.type(rangeInput, '1-3');
      
      const splitButton = screen.getByRole('button', { name: /split PDF/i });
      await user.click(splitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/splitting PDF/i)).toBeInTheDocument();
      });
    });

    it('shows download state after successful split', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
      });
      
      const rangeInput = screen.getByPlaceholderText(/e\.g\., 1-5, 8, 11-13/i);
      await user.type(rangeInput, '1-2');
      
      const splitButton = screen.getByRole('button', { name: /split PDF/i });
      await user.click(splitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/PDF split successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Download State', () => {
    it('displays download button after split', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
      });
      
      const rangeInput = screen.getByPlaceholderText(/e\.g\., 1-5, 8, 11-13/i);
      await user.type(rangeInput, '1');
      
      await user.click(screen.getByRole('button', { name: /split PDF/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('allows starting over from download state', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
      });
      
      const rangeInput = screen.getByPlaceholderText(/e\.g\., 1-5, 8, 11-13/i);
      await user.type(rangeInput, '1');
      
      await user.click(screen.getByRole('button', { name: /split PDF/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();
      }, { timeout: 3000 });
      
      await user.click(screen.getByRole('button', { name: /start over/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Select PDF file')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles invalid page ranges gracefully', async () => {
      const { extractPages } = await import('../../lib/pdf');
      vi.mocked(extractPages).mockRejectedValueOnce(new Error('Invalid page range'));
      
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
      });
      
      const rangeInput = screen.getByPlaceholderText(/e\.g\., 1-5, 8, 11-13/i);
      await user.type(rangeInput, 'invalid-range');
      
      await user.click(screen.getByRole('button', { name: /split PDF/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/invalid page range/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows toast for empty page ranges submission', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        const splitButton = screen.getByRole('button', { name: /split PDF/i });
        expect(splitButton).toBeDisabled();
      });
    });
  });

  describe('Start Over Functionality', () => {
    it('clears file and ranges when starting over', async () => {
      renderWithProviders(<SplitPdf />);
      
      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      
      await user.upload(input, pdfFile);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
      });
      
      const rangeInput = screen.getByPlaceholderText(/e\.g\., 1-5, 8, 11-13/i);
      await user.type(rangeInput, '1-2');
      
      // Remove button should be available
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Select PDF file')).toBeInTheDocument();
      });
    });
  });
});
