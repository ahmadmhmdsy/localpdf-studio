import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddPageNumbers from './AddPageNumbers';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/pdf', () => ({
  addPageNumbers: vi.fn(async (file: File, options: any) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('AddPageNumbers', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<AddPageNumbers />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<AddPageNumbers />);
    expect(screen.getByRole('heading', { name: /add page numbers/i })).toBeInTheDocument();
  });

  it('transitions to configuration after file upload', async () => {
    renderWithProviders(<AddPageNumbers />);
    
    const pdfFile = await generateDummyPdf(5, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Page Numbers' })).toBeInTheDocument();
    });
  });

  it('provides positioning options', async () => {
    renderWithProviders(<AddPageNumbers />);
    
    const pdfFile = await generateDummyPdf(5, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Top Left/i })).toBeInTheDocument();
    });
  });
});
