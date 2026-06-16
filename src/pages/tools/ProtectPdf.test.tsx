import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProtectPdf from './ProtectPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/security', () => ({
  protectPdf: vi.fn(async (file: File, password: string, permissions: any) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('ProtectPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<ProtectPdf />);
    expect(screen.getByText(/select a PDF to protect/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<ProtectPdf />);
    expect(screen.getByRole('heading', { name: /protect PDF/i })).toBeInTheDocument();
  });

  it('transitions to protection settings after file upload', async () => {
    renderWithProviders(<ProtectPdf />);
    
    const pdfFile = await generateDummyPdf(3, 'confidential.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/min 4 characters/i)).toBeInTheDocument();
    });
  });

  it('provides password and permission options', async () => {
    renderWithProviders(<ProtectPdf />);
    
    const pdfFile = await generateDummyPdf(3, 'confidential.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/permissions/i)).toBeInTheDocument();
    });
  });
});
