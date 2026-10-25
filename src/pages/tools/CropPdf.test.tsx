import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CropPdf from './CropPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/pdf', () => ({
  cropPdf: vi.fn(async (file: File, cropBox: any) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

vi.mock('../../lib/image', () => ({
  getPdfPageThumbnails: vi.fn(async () => ['data:image/jpeg;base64,mock-thumbnail']),
}));

vi.mock('../../lib/edit', () => ({
  cropPdf: vi.fn(async () => new Uint8Array([1, 2, 3, 4, 5])),
}));

describe('CropPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<CropPdf />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<CropPdf />);
    expect(screen.getByRole('heading', { name: /crop PDF/i })).toBeInTheDocument();
  });

  it('transitions to crop interface after file upload', async () => {
    renderWithProviders(<CropPdf />);
    
    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      const hasLoading = screen.queryByText(/loading preview/i);
      const hasDraw = screen.queryByText(/draw a rectangle/i);
      const hasCropBtn = screen.queryByRole('button', { name: /crop PDF/i });
      expect(hasLoading || hasDraw || hasCropBtn).toBeInTheDocument();
    });
  });

  it('provides crop area selection', async () => {
    renderWithProviders(<CropPdf />);
    
    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/draw a rectangle to crop all pages/i)).toBeInTheDocument();
    });
  });
});
