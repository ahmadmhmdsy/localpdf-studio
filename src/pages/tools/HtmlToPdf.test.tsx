import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToolsStore } from '../../store/toolsStore';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HtmlToPdf from './HtmlToPdf';
import { renderWithProviders } from '../../tests/utils';
import { A4_HEIGHT_CSS_PX, A4_WIDTH_CSS_PX } from '../../constants/htmlToPdf';

interface MockPdfInstance {
  options: { orientation?: string };
  addPage: ReturnType<typeof vi.fn>;
  addImage: ReturnType<typeof vi.fn>;
  output: ReturnType<typeof vi.fn>;
}

const { toJpegMock, pdfInstances } = vi.hoisted(() => ({
  toJpegMock: vi.fn(async (_node: HTMLElement, _options: unknown) => 'data:image/jpeg;base64,AAAA'),
  pdfInstances: [] as unknown[],
}));

vi.mock('html-to-image', () => ({ toJpeg: toJpegMock }));

vi.mock('jspdf', () => {
  class MockJsPDF {
    options: { orientation?: string };
    addPage = vi.fn();
    addImage = vi.fn();
    output = vi.fn(() => new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };

    constructor(options: { orientation?: string } = {}) {
      this.options = options;
      const landscape = options.orientation === 'landscape';
      const pageSize = {
        width: landscape ? 841.89 : 595.28,
        height: landscape ? 595.28 : 841.89,
      };
      this.internal = {
        pageSize: {
          getWidth: () => pageSize.width,
          getHeight: () => pageSize.height,
        },
      };
      pdfInstances.push(this);
    }
  }

  return { jsPDF: MockJsPDF };
});

function captureElement(): HTMLElement {
  return screen.getByTestId('html-pdf-capture');
}

function setContentHeight(heightPx: number): void {
  Object.defineProperty(captureElement(), 'scrollHeight', {
    configurable: true,
    value: heightPx,
  });
}

function currentPdf(): MockPdfInstance {
  return pdfInstances[pdfInstances.length - 1] as MockPdfInstance;
}

describe('HtmlToPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    useToolsStore.setState({ locale: 'en' });
    user = userEvent.setup();
    vi.clearAllMocks();
    pdfInstances.length = 0;
    toJpegMock.mockResolvedValue('data:image/jpeg;base64,AAAA');
  });

  async function convertToPdf(): Promise<void> {
    await user.click(screen.getByRole('button', { name: /convert to pdf/i }));
    await waitFor(() => {
      expect(screen.getByText(/PDF generated successfully/i)).toBeInTheDocument();
    });
  }

  it('renders HTML input on initial load', () => {
    renderWithProviders(<HtmlToPdf />);
    expect(screen.getByPlaceholderText(/Your HTML here/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<HtmlToPdf />);
    expect(screen.getByRole('heading', { name: /HTML to PDF/i })).toBeInTheDocument();
  });

  it('does not offer a URL input mode (it was dead code)', () => {
    renderWithProviders(<HtmlToPdf />);
    expect(screen.queryByRole('button', { name: /web url/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/https:\/\/example\.com/i)).not.toBeInTheDocument();
  });

  it('allows HTML content input', async () => {
    renderWithProviders(<HtmlToPdf />);

    const textarea = screen.getByPlaceholderText(/Your HTML here/i);
    await user.clear(textarea);
    await user.type(textarea, '<h1>Test</h1>');

    expect(textarea).toHaveValue('<h1>Test</h1>');
  });

  it('offers portrait and landscape orientation options, portrait by default', async () => {
    renderWithProviders(<HtmlToPdf />);

    const portrait = screen.getByRole('button', { name: 'Portrait' });
    const landscape = screen.getByRole('button', { name: 'Landscape' });

    expect(portrait).toHaveAttribute('aria-pressed', 'true');
    expect(landscape).toHaveAttribute('aria-pressed', 'false');
    expect(parseFloat(captureElement().style.width)).toBeCloseTo(A4_WIDTH_CSS_PX);

    await user.click(landscape);

    expect(portrait).toHaveAttribute('aria-pressed', 'false');
    expect(landscape).toHaveAttribute('aria-pressed', 'true');
    expect(parseFloat(captureElement().style.width)).toBeCloseTo(A4_HEIGHT_CSS_PX);

    await user.click(portrait);

    expect(portrait).toHaveAttribute('aria-pressed', 'true');
    expect(parseFloat(captureElement().style.width)).toBeCloseTo(A4_WIDTH_CSS_PX);
  });

  it('keeps Convert disabled until there is HTML content', async () => {
    renderWithProviders(<HtmlToPdf />);

    const convertButton = screen.getByRole('button', { name: /convert to pdf/i });
    expect(convertButton).toBeEnabled();

    await user.clear(screen.getByPlaceholderText(/Your HTML here/i));
    expect(convertButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/Your HTML here/i), '<p>again</p>');
    expect(convertButton).toBeEnabled();
  });

  it('splits a long document across multiple A4 pages', async () => {
    renderWithProviders(<HtmlToPdf />);
    setContentHeight(A4_HEIGHT_CSS_PX * 2.5);

    await convertToPdf();

    expect(toJpegMock).toHaveBeenCalledTimes(3);
    expect(currentPdf().addPage).toHaveBeenCalledTimes(2);
    expect(currentPdf().addImage).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/3-page A4 PDF/i)).toBeInTheDocument();
  });

  it('uses landscape page geometry when Landscape is selected', async () => {
    renderWithProviders(<HtmlToPdf />);
    setContentHeight(A4_HEIGHT_CSS_PX * 0.75);

    await user.click(screen.getByRole('button', { name: 'Landscape' }));
    await convertToPdf();

    const pdf = currentPdf();
    expect(pdf.options.orientation).toBe('landscape');
    expect(toJpegMock.mock.calls[0][1]).toMatchObject({
      width: A4_HEIGHT_CSS_PX,
      height: A4_WIDTH_CSS_PX,
    });
    expect(pdf.addImage).toHaveBeenCalledTimes(2);
    expect(pdf.addImage.mock.calls[0][4]).toBeCloseTo(841.89, 2);
    expect(pdf.addImage.mock.calls[0][5]).toBeCloseTo(595.28, 2);
  });

  it('shows a toast and returns to the editor when conversion fails', async () => {
    toJpegMock.mockRejectedValueOnce(new Error('raster failed'));
    renderWithProviders(<HtmlToPdf />);
    setContentHeight(A4_HEIGHT_CSS_PX * 0.5);

    await user.click(screen.getByRole('button', { name: /convert to pdf/i }));

    await waitFor(() => {
      expect(screen.getByText('An error occurred. Please try again.')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/Your HTML here/i)).toBeInTheDocument();
  });

  it('renders the page in Arabic when that locale is active', async () => {
    useToolsStore.setState({ locale: 'ar' });
    renderWithProviders(<HtmlToPdf />);
    expect(screen.getByRole('button', { name: 'تحويل إلى PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'عمودي' })).toBeInTheDocument();
    expect(screen.getByText(/لا يمكن تحديد النص/)).toBeInTheDocument();
  });
});
