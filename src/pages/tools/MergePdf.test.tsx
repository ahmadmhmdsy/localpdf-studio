import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MergePdf from './MergePdf';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

const { mergePdfsMock } = vi.hoisted(() => ({
  mergePdfsMock: vi.fn(),
}));

// Mock pdf-lib operations
vi.mock('../../lib/pdf', () => ({
  mergePdfs: mergePdfsMock,
}));

describe('MergePdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mergePdfsMock.mockReset();
    mergePdfsMock.mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]));
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('renders upload zone on initial load', () => {
      renderWithProviders(<MergePdf />);
      
      expect(screen.getByText('Select PDF files')).toBeInTheDocument();
      expect(screen.getByText(/drop PDFs here/i)).toBeInTheDocument();
    });

    it('displays tool title and description', () => {
      renderWithProviders(<MergePdf />);
      
      expect(screen.getByRole('heading', { name: 'Merge PDF' })).toBeInTheDocument();
      expect(screen.getByText(/combine PDFs in the order/i)).toBeInTheDocument();
    });

    it('does not make an absolute local-only privacy claim', () => {
      renderWithProviders(<MergePdf />);

      // The route-level disclosure is rendered by ToolAvailabilityGate in App.tsx;
      // the upload zone itself must not claim that files never leave the device.
      expect(screen.queryByText(/files never leave your device/i)).not.toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('transitions to configure step after file selection', async () => {
      renderWithProviders(<MergePdf />);
      
      const pdfFile = await generateDummyPdf(3, 'test1.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [pdfFile]);
      
      await waitFor(() => {
        expect(screen.getByText('Drag and drop to reorder files')).toBeInTheDocument();
      });
    });

    it('displays uploaded file details', async () => {
      renderWithProviders(<MergePdf />);
      
      const pdfFile = await generateDummyPdf(3, 'document.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [pdfFile]);
      
      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
        expect(screen.getByText(/MB/)).toBeInTheDocument();
      });
    });

    it('allows uploading multiple files', async () => {
      renderWithProviders(<MergePdf />);
      
      const file1 = await generateDummyPdf(2, 'first.pdf');
      const file2 = await generateDummyPdf(2, 'second.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [file1, file2]);
      
      await waitFor(() => {
        expect(screen.getByText('first.pdf')).toBeInTheDocument();
        expect(screen.getByText('second.pdf')).toBeInTheDocument();
      });
    });

    it('shows "Add more files" button in configure step', async () => {
      renderWithProviders(<MergePdf />);
      
      const pdfFile = await generateDummyPdf(2, 'test.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [pdfFile]);
      
      await waitFor(() => {
        expect(screen.getByText(/add more files/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Management', () => {
    it('allows removing individual files', async () => {
      renderWithProviders(<MergePdf />);
      
      const file1 = await generateDummyPdf(2, 'keep.pdf');
      const file2 = await generateDummyPdf(2, 'remove.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [file1, file2]);
      
      await waitFor(() => {
        expect(screen.getByText('remove.pdf')).toBeInTheDocument();
      });
      
      // Find and click the remove button for the second file
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      const removeButton = removeButtons.find(btn => 
        btn.closest('[class*="flex items-center"]')?.textContent?.includes('remove.pdf')
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }
      
      await waitFor(() => {
        expect(screen.queryByText('remove.pdf')).not.toBeInTheDocument();
        expect(screen.getByText('keep.pdf')).toBeInTheDocument();
      });
    });

    it('returns to upload step when all files are removed', async () => {
      renderWithProviders(<MergePdf />);
      
      const pdfFile = await generateDummyPdf(2, 'test.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [pdfFile]);
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
      
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      if (removeButtons.length > 0) {
        await user.click(removeButtons[0]);
      }
      
      await waitFor(() => {
        expect(screen.getByText('Select PDF files')).toBeInTheDocument();
      });
    });
  });

  describe('Merge Operation', () => {
    it('shows merge button disabled with less than 2 files', async () => {
      renderWithProviders(<MergePdf />);
      
      const pdfFile = await generateDummyPdf(2, 'single.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [pdfFile]);
      
      await waitFor(() => {
        const mergeButton = screen.getByRole('button', { name: /merge PDF/i });
        expect(mergeButton).toBeDisabled();
      });
    });

    it('enables merge button with 2 or more files', async () => {
      renderWithProviders(<MergePdf />);
      
      const file1 = await generateDummyPdf(2, 'first.pdf');
      const file2 = await generateDummyPdf(2, 'second.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [file1, file2]);
      
      await waitFor(() => {
        const mergeButton = screen.getByRole('button', { name: /merge PDF/i });
        expect(mergeButton).not.toBeDisabled();
      });
    });

    it('shows processing and completes when merging resolves', async () => {
      renderWithProviders(<MergePdf />);

      const file1 = await generateDummyPdf(2, 'first.pdf');
      const file2 = await generateDummyPdf(2, 'second.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      const merge = createDeferred<Uint8Array>();
      const result = new Uint8Array([1, 2, 3, 4, 5]);
      mergePdfsMock.mockReturnValueOnce(merge.promise);

      await user.upload(input, [file1, file2]);

      await waitFor(() => {
        const mergeButton = screen.getByRole('button', { name: /merge PDF/i });
        expect(mergeButton).not.toBeDisabled();
      });

      const mergeButton = screen.getByRole('button', { name: /merge PDF/i });
      await user.click(mergeButton);

      expect(await screen.findByText(/merging PDFs/i)).toBeInTheDocument();
      expect(mergePdfsMock).toHaveBeenCalledWith([file1, file2]);

      await act(async () => {
        merge.resolve(result);
        await merge.promise;
      });

      expect(await screen.findByText(/merged successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
    });

    it('shows download state after successful merge', async () => {
      renderWithProviders(<MergePdf />);
      
      const file1 = await generateDummyPdf(2, 'first.pdf');
      const file2 = await generateDummyPdf(2, 'second.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [file1, file2]);
      
      await waitFor(() => {
        const mergeButton = screen.getByRole('button', { name: /merge PDF/i });
        expect(mergeButton).not.toBeDisabled();
      });
      
      const mergeButton = screen.getByRole('button', { name: /merge PDF/i });
      await user.click(mergeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/merged successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Download State', () => {
    it('displays download button after merge', async () => {
      renderWithProviders(<MergePdf />);
      
      const file1 = await generateDummyPdf(2, 'first.pdf');
      const file2 = await generateDummyPdf(2, 'second.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [file1, file2]);
      
      await waitFor(() => {
        const mergeButton = screen.getByRole('button', { name: /merge PDF/i });
        expect(mergeButton).not.toBeDisabled();
      });
      
      await user.click(screen.getByRole('button', { name: /merge PDF/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('allows starting over from download state', async () => {
      renderWithProviders(<MergePdf />);
      
      const file1 = await generateDummyPdf(2, 'first.pdf');
      const file2 = await generateDummyPdf(2, 'second.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [file1, file2]);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /merge PDF/i })).not.toBeDisabled();
      });
      
      await user.click(screen.getByRole('button', { name: /merge PDF/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
      }, { timeout: 3000 });
      
      const startOverButton = screen.getByRole('button', { name: /start over/i });
      await user.click(startOverButton);
      
      await waitFor(() => {
        expect(screen.getByText('Select PDF files')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles merge errors gracefully', async () => {
      mergePdfsMock.mockRejectedValueOnce(new Error('Merge failed'));
      
      renderWithProviders(<MergePdf />);
      
      const file1 = await generateDummyPdf(2, 'first.pdf');
      const file2 = await generateDummyPdf(2, 'second.pdf');
      const input = screen.getByLabelText(/select PDF files/i);
      
      await user.upload(input, [file1, file2]);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /merge PDF/i })).not.toBeDisabled();
      });
      
      await user.click(screen.getByRole('button', { name: /merge PDF/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
