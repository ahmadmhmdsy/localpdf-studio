import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExcelToPdf from './ExcelToPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyXlsx } from '../../tests/fixtures/officeGenerator';

vi.mock('../../lib/office-excel', () => ({
  convertExcelToPdf: vi.fn(async (file: File) => {
    await new Promise(r => setTimeout(r, 200));
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('ExcelToPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<ExcelToPdf />);
    expect(screen.getByText(/select an Excel file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<ExcelToPdf />);
    expect(screen.getByRole('heading', { name: /EXCEL to PDF/i })).toBeInTheDocument();
  });

  it('accepts XLSX file upload', async () => {
    renderWithProviders(<ExcelToPdf />);
    
    const xlsxFile = generateDummyXlsx('data.xlsx');
    const input = screen.getByLabelText(/select Excel file/i);
    
    await user.upload(input, xlsxFile);
    
    await waitFor(() => {
      expect(screen.getByText(/converting to PDF/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
