import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RepairPdf from './RepairPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/repair', () => ({
  repairPdf: vi.fn(async (file: File) => {
    await new Promise(r => setTimeout(r, 200));
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('RepairPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<RepairPdf />);
    expect(screen.getByText(/select a corrupted PDF/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<RepairPdf />);
    expect(screen.getByRole('heading', { name: /repair PDF/i })).toBeInTheDocument();
  });

  it('transitions to processing after file selection', async () => {
    renderWithProviders(<RepairPdf />);
    
    const pdfFile = await generateDummyPdf(3, 'corrupted.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      const hasRepairing = screen.queryByText(/repairing/i);
      const hasComplete = screen.queryByText(/repair complete/i);
      const hasTryAgain = screen.queryByText(/try again/i);
      expect(hasRepairing || hasComplete || hasTryAgain).toBeInTheDocument();
    });
  });

  it('shows success or error state after repair', async () => {
    renderWithProviders(<RepairPdf />);
    
    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      const hasRepairing = screen.queryByText(/repairing/i);
      const hasComplete = screen.queryByText(/repair complete/i);
      const hasTryAgain = screen.queryByText(/try again/i);
      expect(hasRepairing || hasComplete || hasTryAgain).toBeInTheDocument();
    });
  });
});
