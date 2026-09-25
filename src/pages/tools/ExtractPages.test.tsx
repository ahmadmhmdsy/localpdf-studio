import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExtractPages from './ExtractPages';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

const { extractPagesMock } = vi.hoisted(() => ({
  extractPagesMock: vi.fn(),
}));

vi.mock('../../lib/pdf', () => ({
  extractPages: extractPagesMock,
}));

describe('ExtractPages', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    extractPagesMock.mockReset();
    extractPagesMock.mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]));
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<ExtractPages />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<ExtractPages />);
    expect(screen.getByRole('heading', { name: /extract pages/i })).toBeInTheDocument();
  });

  it('transitions to configure step after file selection', async () => {
    renderWithProviders(<ExtractPages />);
    
    const pdfFile = await generateDummyPdf(5, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/pages to extract/i)).toBeInTheDocument();
    });
  });

  it('shows processing and completes when extraction resolves', async () => {
    renderWithProviders(<ExtractPages />);

    const pdfFile = await generateDummyPdf(5, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    const extraction = createDeferred<Uint8Array>();
    const result = new Uint8Array([1, 2, 3, 4, 5]);
    extractPagesMock.mockReturnValueOnce(extraction.promise);

    await user.upload(input, pdfFile);

    await waitFor(() => {
      expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
    });

    const rangeInput = screen.getByPlaceholderText(/e\.g\., 1-5, 8/i);
    await user.type(rangeInput, '1-2');

    const extractButton = screen.getByRole('button', { name: /extract pages/i });
    expect(extractButton).not.toBeDisabled();

    await user.click(extractButton);

    expect(await screen.findByText('Extracting pages...')).toBeInTheDocument();
    expect(extractPagesMock).toHaveBeenCalledWith(pdfFile, '1-2');

    await act(async () => {
      extraction.resolve(result);
      await extraction.promise;
    });

    expect(await screen.findByText('Pages extracted successfully!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download extracted_test\.pdf/i })).toHaveAttribute('href', 'mock-url');
  });
});
