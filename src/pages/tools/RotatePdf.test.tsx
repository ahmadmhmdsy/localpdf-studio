import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToolsStore } from '../../store/toolsStore';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RotatePdf from './RotatePdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/pdf', () => ({
  rotatePdf: vi.fn(async (file: File, angle: number) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('RotatePdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    useToolsStore.setState({ locale: 'en' });
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<RotatePdf />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<RotatePdf />);
    expect(screen.getByRole('heading', { name: /rotate PDF/i })).toBeInTheDocument();
  });

  it('transitions to rotate options after file upload', async () => {
    renderWithProviders(<RotatePdf />);
    
    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/rotation/i) || screen.getByRole('button', { name: /rotate/i })).toBeInTheDocument();
    });
  });

  it('provides rotation angle options', async () => {
    renderWithProviders(<RotatePdf />);

    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);

    await user.upload(input, pdfFile);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /right \(90/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upside down \(180/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /left \(270/i })).toBeInTheDocument();
    });
  });

  it('renders the page in Arabic when that locale is active', () => {
    useToolsStore.setState({ locale: 'ar' });
    renderWithProviders(<RotatePdf />);
    expect(screen.getByText('اختر ملف PDF')).toBeInTheDocument();
  });
});
