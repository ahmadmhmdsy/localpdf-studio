import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SplitPdf from './SplitPdf';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';
import type { SplitFile } from '../../lib/pdf';

const { splitPdfToFilesMock, buildZipFileMock } = vi.hoisted(() => ({
  splitPdfToFilesMock: vi.fn(),
  buildZipFileMock: vi.fn(),
}));

vi.mock('../../lib/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/pdf')>();
  return { ...actual, splitPdfToFiles: splitPdfToFilesMock };
});

vi.mock('../../lib/zip', () => ({
  buildZipFile: buildZipFileMock,
}));

const SINGLE_FILE: SplitFile[] = [
  { fileName: 'split_test_1-3.pdf', data: new Uint8Array([1, 2, 3]) },
];

const MULTIPLE_FILES: SplitFile[] = [
  { fileName: 'split_test_1.pdf', data: new Uint8Array([1]) },
  { fileName: 'split_test_2.pdf', data: new Uint8Array([2]) },
  { fileName: 'split_test_3.pdf', data: new Uint8Array([3]) },
];

describe('SplitPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    splitPdfToFilesMock.mockReset();
    buildZipFileMock.mockReset();
    vi.clearAllMocks();
    splitPdfToFilesMock.mockResolvedValue(SINGLE_FILE);
    buildZipFileMock.mockResolvedValue(new Blob(['zip-bytes'], { type: 'application/zip' }));
  });

  async function uploadPdf(pageCount = 5, fileName = 'test.pdf'): Promise<File> {
    const pdfFile = await generateDummyPdf(pageCount, fileName);
    const input = screen.getByLabelText(/select PDF file/i);
    await user.upload(input, pdfFile);
    await screen.findByRole('radio', { name: /by page range/i });
    return pdfFile;
  }

  describe('Initial State', () => {
    it('renders upload zone on initial load', () => {
      renderWithProviders(<SplitPdf />);

      expect(screen.getByText('Select PDF file')).toBeInTheDocument();
      expect(screen.getByText(/drop PDF here/i)).toBeInTheDocument();
    });

    it('displays the tool title', () => {
      renderWithProviders(<SplitPdf />);

      expect(screen.getByRole('heading', { name: 'Split PDF' })).toBeInTheDocument();
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

      await uploadPdf();

      expect(screen.getByText(/how should the PDF be split/i)).toBeInTheDocument();
    });

    it('displays uploaded file details in configure step', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf(5, 'my-document.pdf');

      expect(screen.getByText('my-document.pdf')).toBeInTheDocument();
      expect(screen.getByText(/MB/)).toBeInTheDocument();
    });
  });

  describe('Split mode selection', () => {
    it('offers the three split modes and defaults to page ranges', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf();

      expect(screen.getByRole('radio', { name: /by page range/i })).toBeChecked();
      expect(screen.getByRole('radio', { name: /every n pages/i })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: /one file per page/i })).not.toBeChecked();
      expect(screen.getByLabelText(/page ranges/i)).toBeInTheDocument();
    });

    it('shows the pages-per-file input for the "Every N pages" mode', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf();
      await user.click(screen.getByRole('radio', { name: /every n pages/i }));

      const pagesInput = screen.getByLabelText(/pages per file/i);
      expect(pagesInput).toHaveValue(10);
      expect(screen.queryByLabelText(/page ranges/i)).not.toBeInTheDocument();
    });

    it('enables the split button for "One file per page" without extra input', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf();
      await user.click(screen.getByRole('radio', { name: /one file per page/i }));

      expect(screen.queryByLabelText(/page ranges/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/pages per file/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /split PDF/i })).toBeEnabled();
    });
  });

  describe('Page range configuration', () => {
    it('disables the split button without page ranges', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf();

      expect(screen.getByRole('button', { name: /split PDF/i })).toBeDisabled();
    });

    it('enables the split button with valid page ranges', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf();
      await user.type(screen.getByPlaceholderText(/e\.g\., 1-3, 4, 5-8/i), '1-3,5');

      expect(screen.getByRole('button', { name: /split PDF/i })).toBeEnabled();
    });

    it('shows helper text for the page range format', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf();

      expect(screen.getByText(/each range becomes its own PDF file/i)).toBeInTheDocument();
    });
  });

  describe('Split operation', () => {
    it('shows processing and downloads a single PDF when one range is produced', async () => {
      renderWithProviders(<SplitPdf />);

      const pdfFile = await uploadPdf();
      const split = createDeferred<SplitFile[]>();
      splitPdfToFilesMock.mockReturnValueOnce(split.promise);

      await user.type(screen.getByPlaceholderText(/e\.g\., 1-3, 4, 5-8/i), '1-3');
      await user.click(screen.getByRole('button', { name: /split PDF/i }));

      expect(await screen.findByText(/splitting PDF/i)).toBeInTheDocument();
      expect(splitPdfToFilesMock).toHaveBeenCalledWith(pdfFile, 'ranges', { rangeString: '1-3' });

      await act(async () => {
        split.resolve(SINGLE_FILE);
        await split.promise;
      });

      expect(
        await screen.findByRole('link', { name: /download split_test_1-3\.pdf/i })
      ).toHaveAttribute('href', 'mock-url');
      expect(buildZipFileMock).not.toHaveBeenCalled();
    });

    it('passes the pages-per-file value in the "Every N pages" mode', async () => {
      renderWithProviders(<SplitPdf />);

      const pdfFile = await uploadPdf();
      await user.click(screen.getByRole('radio', { name: /every n pages/i }));

      const pagesInput = screen.getByLabelText(/pages per file/i);
      await user.clear(pagesInput);
      await user.type(pagesInput, '2');
      await user.click(screen.getByRole('button', { name: /split PDF/i }));

      await waitFor(() => {
        expect(splitPdfToFilesMock).toHaveBeenCalledWith(pdfFile, 'every-n', { pagesPerFile: 2 });
      });
    });

    it('downloads a ZIP archive when several files are produced', async () => {
      renderWithProviders(<SplitPdf />);

      const pdfFile = await uploadPdf(3, 'test.pdf');
      splitPdfToFilesMock.mockResolvedValueOnce(MULTIPLE_FILES);

      await user.click(screen.getByRole('radio', { name: /one file per page/i }));
      await user.click(screen.getByRole('button', { name: /split PDF/i }));

      expect(splitPdfToFilesMock).toHaveBeenCalledWith(pdfFile, 'each-page', {});

      expect(
        await screen.findByRole('link', { name: /download split_test\.zip/i })
      ).toHaveAttribute('href', 'mock-url');
      expect(buildZipFileMock).toHaveBeenCalledWith(
        MULTIPLE_FILES.map(({ fileName, data }) => ({ name: fileName, data }))
      );
      expect(screen.getByText(/packaged as a ZIP archive/i)).toBeInTheDocument();
    });

    it('disables the split button for an invalid pages-per-file value', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf();
      await user.click(screen.getByRole('radio', { name: /every n pages/i }));

      const pagesInput = screen.getByLabelText(/pages per file/i);
      await user.clear(pagesInput);

      expect(screen.getByRole('button', { name: /split PDF/i })).toBeDisabled();
    });
  });

  describe('Download State', () => {
    it('allows starting over from the download state', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf();
      await user.type(screen.getByPlaceholderText(/e\.g\., 1-3, 4, 5-8/i), '1');
      await user.click(screen.getByRole('button', { name: /split PDF/i }));

      const startOver = await screen.findByRole('button', { name: /start over/i });
      await user.click(startOver);

      await waitFor(() => {
        expect(screen.getByText('Select PDF file')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows the error message and returns to the configure step', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf();
      splitPdfToFilesMock.mockRejectedValueOnce(new Error('Invalid page range'));

      await user.type(screen.getByPlaceholderText(/e\.g\., 1-3, 4, 5-8/i), 'invalid-range');
      await user.click(screen.getByRole('button', { name: /split PDF/i }));

      expect(await screen.findByText(/invalid page range/i)).toBeInTheDocument();
      expect(await screen.findByRole('radio', { name: /by page range/i })).toBeInTheDocument();
    });
  });

  describe('Start Over Functionality', () => {
    it('clears the file when removing it in the configure step', async () => {
      renderWithProviders(<SplitPdf />);

      await uploadPdf();
      await user.type(screen.getByPlaceholderText(/e\.g\., 1-3, 4, 5-8/i), '1-2');

      await user.click(screen.getByRole('button', { name: /remove file/i }));

      await waitFor(() => {
        expect(screen.getByText('Select PDF file')).toBeInTheDocument();
      });
    });
  });
});
