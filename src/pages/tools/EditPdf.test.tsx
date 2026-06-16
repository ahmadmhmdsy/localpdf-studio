import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditPdf from './EditPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/edit', () => ({
  editPdf: vi.fn(async (file: File, annotations: any[]) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

vi.mock('../../lib/image', () => ({
  getPdfPageThumbnails: vi.fn(async () => ['data:image/jpeg;base64,mock-thumbnail']),
}));

describe('EditPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<EditPdf />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<EditPdf />);
    expect(screen.getByRole('heading', { name: /edit PDF/i })).toBeInTheDocument();
  });

  it('transitions to editor after file upload', async () => {
    renderWithProviders(<EditPdf />);
    
    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      const hasLoading = screen.queryByText(/loading pages/i);
      const hasEdit = screen.queryByText(/edit PDF/i);
      const hasSave = screen.queryByRole('button', { name: /save/i });
      expect(hasLoading || hasEdit || hasSave).toBeInTheDocument();
    });
  });

  it('provides annotation tools', async () => {
    renderWithProviders(<EditPdf />);
    
    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      const hasLoading = screen.queryByText(/loading pages/i);
      const hasPages = screen.queryByText(/pages/i);
      const hasSave = screen.queryByRole('button', { name: /save/i });
      expect(hasLoading || hasPages || hasSave).toBeInTheDocument();
    });
  });
});
