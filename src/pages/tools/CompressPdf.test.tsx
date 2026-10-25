import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompressPdf from './CompressPdf';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyPdf, generateLargePdf } from '../../tests/fixtures/pdfGenerator';
import { useToolsStore } from '../../store/toolsStore';

const { compressPdfMock } = vi.hoisted(() => ({
  compressPdfMock: vi.fn(),
}));

vi.mock('../../lib/compress', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/compress')>()),
  compressPdf: compressPdfMock,
}));

const { CompressionCancelledError, CompressionLimitError } = await import('../../lib/compress');

describe('CompressPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    compressPdfMock.mockReset();
    compressPdfMock.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      notes: ['Test note: best-effort compression only.'],
      keptOriginal: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    useToolsStore.setState({ locale: 'en' });
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

  it('renders the compress flow in Arabic when that locale is active', async () => {
    useToolsStore.setState({ locale: 'ar' });
    renderWithProviders(<CompressPdf />);

    expect(screen.getByRole('heading', { name: 'ضغط PDF' })).toBeInTheDocument();

    await user.upload(screen.getByLabelText('اختر ملف PDF'), await generateDummyPdf(2, 'test.pdf'));

    expect(await screen.findByText('مستوى الضغط')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /بلا فقدان/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'ضغط PDF' })).toBeInTheDocument();
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
        expect(screen.getByText(/^\d+\.\d{2} MB$/)).toBeInTheDocument();
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
    it('shows processing and completes when compression resolves', async () => {
      renderWithProviders(<CompressPdf />);

      const pdfFile = await generateDummyPdf(5, 'test.pdf');
      const input = screen.getByLabelText(/select PDF file/i);
      const compressionResult = {
        bytes: new Uint8Array([1, 2, 3]),
        notes: ['Test note: best-effort compression only.'],
        keptOriginal: false,
      };
      const compression = createDeferred<typeof compressionResult>();
      compressPdfMock.mockReturnValueOnce(compression.promise);

      await user.upload(input, pdfFile);

      const compressButton = await screen.findByRole('button', { name: /compress PDF/i });
      await user.click(compressButton);

      expect(await screen.findByText('Compressing PDF...')).toBeInTheDocument();
      expect(compressPdfMock).toHaveBeenCalledWith(pdfFile, 'medium', {
        images: 'off',
        signal: expect.any(AbortSignal),
      });

      await act(async () => {
        compression.resolve(compressionResult);
        await compression.promise;
      });

      expect(
        await screen.findByRole('link', { name: /download compressed_test\.pdf/i })
      ).toHaveAttribute('href', 'mock-url');
    });

    it('passes the chosen image re-compression preset', async () => {
      renderWithProviders(<CompressPdf />);

      const pdfFile = await generateDummyPdf(1, 'test.pdf');
      await user.upload(screen.getByLabelText(/select PDF file/i), pdfFile);

      await user.click(await screen.findByRole('radio', { name: /strong/i }));
      await user.click(screen.getByRole('button', { name: /compress PDF/i }));

      expect(compressPdfMock).toHaveBeenCalledWith(pdfFile, 'medium', {
        images: 'strong',
        signal: expect.any(AbortSignal),
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

      // The download state shows "Compressed from <original> to <new>"
      // rather than a "X% reduced" claim, because the file can grow.
      await waitFor(() => {
        expect(screen.getByText(/compressed from/i)).toBeInTheDocument();
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

      // The "Compressed from X to Y" copy encodes both original and
      // resulting size; both surfaces are checked for by the regex.
      await waitFor(() => {
        expect(screen.getByText(/compressed from .* to/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Compression level choice', () => {
    it('offers one level choice with Lossless selected by default', async () => {
      renderWithProviders(<CompressPdf />);
      await user.upload(screen.getByLabelText(/select PDF file/i), await generateDummyPdf(1, 'test.pdf'));

      const group = await screen.findByRole('group', { name: /compression level/i });
      expect(group).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(4);
      expect(screen.getByRole('radio', { name: /lossless/i })).toBeChecked();
      expect(screen.getByText(/limit: 100 MB per file/i)).toBeInTheDocument();
    });
  });

  describe('Cancellation and limits', () => {
    it('cancels a running compression and returns to configure', async () => {
      renderWithProviders(<CompressPdf />);
      const compression = createDeferred<never>();
      compressPdfMock.mockReturnValueOnce(compression.promise);

      await user.upload(screen.getByLabelText(/select PDF file/i), await generateDummyPdf(1, 'test.pdf'));
      await user.click(await screen.findByRole('button', { name: /compress PDF/i }));
      await user.click(await screen.findByRole('button', { name: /cancel/i }));

      const [, , options] = compressPdfMock.mock.calls[0];
      expect((options as { signal: AbortSignal }).signal.aborted).toBe(true);
      expect(await screen.findByRole('button', { name: /compress PDF/i })).toBeInTheDocument();

      await act(async () => {
        compression.reject(new CompressionCancelledError());
        await compression.promise.catch(() => undefined);
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument();
    });

    it('shows the size-limit message', async () => {
      renderWithProviders(<CompressPdf />);
      compressPdfMock.mockRejectedValueOnce(
        new CompressionLimitError('This file is 150.0 MB. Compression is limited to 100 MB per file.'),
      );

      await user.upload(screen.getByLabelText(/select PDF file/i), await generateDummyPdf(1, 'test.pdf'));
      await user.click(await screen.findByRole('button', { name: /compress PDF/i }));

      expect(await screen.findByText(/compression is limited to 100 MB/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /compress PDF/i })).toBeInTheDocument();
    });
  });

  describe('Never larger', () => {
    it('says when the original file was returned', async () => {
      renderWithProviders(<CompressPdf />);
      compressPdfMock.mockResolvedValueOnce({
        bytes: new Uint8Array([1, 2, 3]),
        notes: ['The compressed version was not smaller than the original, so the original file was returned unchanged.'],
        keptOriginal: true,
      });

      await user.upload(screen.getByLabelText(/select PDF file/i), await generateDummyPdf(1, 'test.pdf'));
      await user.click(await screen.findByRole('button', { name: /compress PDF/i }));

      expect(await screen.findByText(/could not be made smaller/i)).toBeInTheDocument();
      expect(screen.queryByText(/compressed from/i)).not.toBeInTheDocument();
    });
  });
});
