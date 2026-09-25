import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfToPowerpoint from './PdfToPowerpoint';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

const { convertPdfToPowerpointMock } = vi.hoisted(() => ({
  convertPdfToPowerpointMock: vi.fn(),
}));

vi.mock('../../lib/pdf-to-pptx', () => ({
  convertPdfToPowerpoint: convertPdfToPowerpointMock,
}));

describe('PdfToPowerpoint', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    convertPdfToPowerpointMock.mockReset();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<PdfToPowerpoint />);
    expect(screen.getByText(/select a PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<PdfToPowerpoint />);
    expect(screen.getByRole('heading', { name: /PDF to POWERPOINT/i })).toBeInTheDocument();
  });

  it('shows processing and completes when conversion resolves', async () => {
    renderWithProviders(<PdfToPowerpoint />);

    const pdfFile = await generateDummyPdf(5, 'slides.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    const conversion = createDeferred<Blob>();
    const resultBlob = new Blob([new Uint8Array([1, 2, 3, 4, 5])], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    convertPdfToPowerpointMock.mockReturnValueOnce(conversion.promise);

    await user.upload(input, pdfFile);

    expect(await screen.findByText(/creating presentation/i)).toBeInTheDocument();
    expect(convertPdfToPowerpointMock).toHaveBeenCalledWith(pdfFile);

    await act(async () => {
      conversion.resolve(resultBlob);
      await conversion.promise;
    });

    expect(await screen.findByText(/conversion successful!/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download pptx/i })).toBeInTheDocument();
  });
});
