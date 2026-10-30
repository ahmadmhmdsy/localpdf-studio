import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToolsStore } from '../../store/toolsStore';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComparePdf from './ComparePdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/pdf', () => ({
  comparePdfs: vi.fn(async (file1: File, file2: File) => {
    return { differences: [], similarity: 0.85 };
  }),
}));

vi.mock('../../lib/image', () => ({
  getPdfPageThumbnails: vi.fn(async () => ['data:image/jpeg;base64,mock-thumbnail']),
}));

describe('ComparePdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    useToolsStore.setState({ locale: 'en' });
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone for first file on initial load', () => {
    renderWithProviders(<ComparePdf />);
    expect(screen.getByText(/select 2 PDF files/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<ComparePdf />);
    expect(screen.getByRole('heading', { name: /compare PDF/i })).toBeInTheDocument();
  });

  it('requires two PDF files for comparison', async () => {
    renderWithProviders(<ComparePdf />);
    
    const pdfFile1 = await generateDummyPdf(3, 'version1.pdf');
    const pdfFile2 = await generateDummyPdf(3, 'version2.pdf');
    const input = screen.getByLabelText(/select PDF files/i);
    
    await user.upload(input, [pdfFile1, pdfFile2]);
    
    await waitFor(() => {
      expect(screen.getByText(/side-by-side comparison/i)).toBeInTheDocument();
    });
  });

  it('renders the page in Arabic when that locale is active', () => {
    useToolsStore.setState({ locale: 'ar' });
    renderWithProviders(<ComparePdf />);
    expect(screen.getByText('اختر ملفي PDF')).toBeInTheDocument();
  });
});
