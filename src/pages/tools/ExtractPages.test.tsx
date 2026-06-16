import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExtractPages from './ExtractPages';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/pdf', () => ({
  extractPages: vi.fn(async (file: File, ranges: string) => {
    await new Promise(r => setTimeout(r, 200));
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('ExtractPages', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
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

  it('allows entering page ranges and processes extraction', async () => {
    renderWithProviders(<ExtractPages />);
    
    const pdfFile = await generateDummyPdf(5, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/pages to extract/i)).toBeInTheDocument();
    });
    
    const rangeInput = screen.getByPlaceholderText(/e\.g\., 1-5, 8/i);
    await user.type(rangeInput, '1-2');
    
    const extractButton = screen.getByRole('button', { name: /extract pages/i });
    expect(extractButton).not.toBeDisabled();
    
    await user.click(extractButton);
    
    await waitFor(() => {
      expect(screen.getByText(/extracting pages/i)).toBeInTheDocument();
    });
  });
});
