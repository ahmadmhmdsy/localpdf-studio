import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToolsStore } from '../../store/toolsStore';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddPageNumbers from './AddPageNumbers';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';
import { PAGE_NUMBER_POSITIONS } from '../../lib/pdf';

const { addPageNumbersMock } = vi.hoisted(() => ({
  addPageNumbersMock: vi.fn(),
}));

vi.mock('../../lib/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/pdf')>();
  return { ...actual, addPageNumbers: addPageNumbersMock };
});

const RESULT_BYTES = new Uint8Array([1, 2, 3, 4, 5]);

function positionLabel(position: string): string {
  return position
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

describe('AddPageNumbers', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    useToolsStore.setState({ locale: 'en' });
    user = userEvent.setup();
    addPageNumbersMock.mockReset();
    addPageNumbersMock.mockResolvedValue(RESULT_BYTES);
  });

  async function uploadPdf() {
    const pdfFile = await generateDummyPdf(5, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    await user.upload(input, pdfFile);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Page Numbers' })).toBeInTheDocument();
    });

    return pdfFile;
  }

  it('renders upload zone on initial load', () => {
    renderWithProviders(<AddPageNumbers />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<AddPageNumbers />);
    expect(screen.getByRole('heading', { name: /add page numbers/i })).toBeInTheDocument();
  });

  it('transitions to configuration after file upload', async () => {
    renderWithProviders(<AddPageNumbers />);
    await uploadPdf();
  });

  it('offers every position from the shared position list', async () => {
    renderWithProviders(<AddPageNumbers />);
    await uploadPdf();

    for (const position of PAGE_NUMBER_POSITIONS) {
      expect(screen.getByRole('button', { name: positionLabel(position) })).toBeInTheDocument();
    }
  });

  it('passes the selected middle-row position to the PDF library', async () => {
    renderWithProviders(<AddPageNumbers />);
    const pdfFile = await uploadPdf();

    await user.click(screen.getByRole('button', { name: positionLabel('middle-left') }));
    await user.click(screen.getByRole('button', { name: 'Add Page Numbers' }));

    await waitFor(() => {
      expect(addPageNumbersMock).toHaveBeenCalledWith(pdfFile, 'middle-left');
    });
  });

  it('renders the page in Arabic when that locale is active', () => {
    useToolsStore.setState({ locale: 'ar' });
    renderWithProviders(<AddPageNumbers />);
    expect(screen.getByText('اختر ملف PDF')).toBeInTheDocument();
  });
});
