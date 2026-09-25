import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExcelToPdf from './ExcelToPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyXlsx } from '../../tests/fixtures/officeGenerator';

const { convertExcelToPdfMock, saveAsMock } = vi.hoisted(() => ({
  convertExcelToPdfMock: vi.fn(),
  saveAsMock: vi.fn(),
}));

vi.mock('../../lib/office-excel', () => ({
  convertExcelToPdf: convertExcelToPdfMock,
}));

vi.mock('file-saver', () => ({
  saveAs: saveAsMock,
}));

describe('ExcelToPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    convertExcelToPdfMock.mockReset();
    convertExcelToPdfMock.mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]));
    saveAsMock.mockReset();
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

  it('converts an XLSX file and exposes the PDF output', async () => {
    renderWithProviders(<ExcelToPdf />);

    const xlsxFile = generateDummyXlsx('data.xlsx');
    const input = screen.getByLabelText(/select Excel file/i);

    await user.upload(input, xlsxFile);

    expect(await screen.findByText(/conversion successful!/i)).toBeInTheDocument();
    expect(convertExcelToPdfMock).toHaveBeenCalledWith(xlsxFile);

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(saveAsMock).toHaveBeenCalledWith(expect.any(Blob), 'data.pdf');
  });
});
