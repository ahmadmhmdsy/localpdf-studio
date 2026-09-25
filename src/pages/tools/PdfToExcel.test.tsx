import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfToExcel from './PdfToExcel';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

const { convertPdfToExcelMock } = vi.hoisted(() => ({
  convertPdfToExcelMock: vi.fn(),
}));

vi.mock('../../lib/pdf-to-excel', () => ({
  convertPdfToExcel: convertPdfToExcelMock,
}));

describe('PdfToExcel', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    convertPdfToExcelMock.mockReset();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<PdfToExcel />);
    expect(screen.getByText(/select a PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<PdfToExcel />);
    expect(screen.getByRole('heading', { name: /PDF to EXCEL/i })).toBeInTheDocument();
  });

  it('converts a PDF and exposes the XLSX output', async () => {
    renderWithProviders(<PdfToExcel />);

    const pdfFile = await generateDummyPdf(3, 'tables.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    const resultBlob = new Blob([new Uint8Array([1, 2, 3, 4, 5])], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    convertPdfToExcelMock.mockResolvedValueOnce(resultBlob);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    try {
      await user.upload(input, pdfFile);

      expect(await screen.findByText(/extraction complete!/i)).toBeInTheDocument();
      expect(convertPdfToExcelMock).toHaveBeenCalledWith(pdfFile);

      await user.click(screen.getByRole('button', { name: /download xlsx/i }));

      expect(clickSpy).toHaveBeenCalledOnce();
      expect(URL.createObjectURL).toHaveBeenCalledWith(resultBlob);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    } finally {
      clickSpy.mockRestore();
    }
  });
});
