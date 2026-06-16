import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddWatermark from './AddWatermark';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/pdf', () => ({
  addWatermark: vi.fn(async (file: File, text: string) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('AddWatermark', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<AddWatermark />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<AddWatermark />);
    expect(screen.getByRole('heading', { name: /add watermark/i })).toBeInTheDocument();
  });

  it('transitions to watermark configuration after file upload', async () => {
    renderWithProviders(<AddWatermark />);
    
    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/watermark text/i)).toBeInTheDocument();
    });
  });

  it('allows entering watermark text', async () => {
    renderWithProviders(<AddWatermark />);
    
    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/watermark text/i)).toBeInTheDocument();
    });
    
    const watermarkInput = screen.getByLabelText(/watermark text/i);
    if (watermarkInput) {
      await user.clear(watermarkInput);
      await user.type(watermarkInput, 'CONFIDENTIAL');
      expect(watermarkInput).toHaveValue('CONFIDENTIAL');
    }
  });
});
