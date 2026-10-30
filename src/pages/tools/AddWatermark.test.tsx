import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToolsStore } from '../../store/toolsStore';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddWatermark from './AddWatermark';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';
import { generateDummyImage } from '../../tests/fixtures/imageGenerator';

const { addWatermarkMock } = vi.hoisted(() => ({
  addWatermarkMock: vi.fn(),
}));

vi.mock('../../lib/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/pdf')>();
  return { ...actual, addWatermark: addWatermarkMock };
});

describe('AddWatermark', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    useToolsStore.setState({ locale: 'en' });
    user = userEvent.setup();
    vi.clearAllMocks();
    addWatermarkMock.mockReset();
    addWatermarkMock.mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]));
  });

  async function uploadPdf(fileName = 'test.pdf'): Promise<File> {
    const pdfFile = await generateDummyPdf(3, fileName);
    const input = screen.getByLabelText(/select PDF file/i);
    await user.upload(input, pdfFile);
    await screen.findByLabelText(/watermark text/i);
    return pdfFile;
  }

  function submitButton(): HTMLElement {
    return screen.getByRole('button', { name: /^add watermark$/i });
  }

  it('renders the upload zone on initial load', () => {
    renderWithProviders(<AddWatermark />);

    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
    expect(screen.getByText(/drop PDF here/i)).toBeInTheDocument();
  });

  it('displays the tool title', () => {
    renderWithProviders(<AddWatermark />);

    expect(screen.getByRole('heading', { name: /add watermark/i })).toBeInTheDocument();
  });

  it('transitions to configuration with the documented defaults after upload', async () => {
    renderWithProviders(<AddWatermark />);

    await uploadPdf();

    expect(screen.getByLabelText(/watermark text/i)).toHaveValue('CONFIDENTIAL');
    expect((screen.getByLabelText(/font size/i) as HTMLInputElement).value).toBe('60');
    expect((screen.getByLabelText(/opacity/i) as HTMLInputElement).value).toBe('0.3');
    expect((screen.getByLabelText(/rotation/i) as HTMLInputElement).value).toBe('45');
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('45°')).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it('states the Latin-only text limitation honestly', async () => {
    renderWithProviders(<AddWatermark />);

    await uploadPdf();

    expect(screen.getByText(/non-Latin text such as Arabic/i)).toBeInTheDocument();
  });

  it('resets to the upload step with the "Remove file" button', async () => {
    renderWithProviders(<AddWatermark />);

    await uploadPdf();
    await user.click(screen.getByRole('button', { name: /remove file/i }));

    expect(screen.getByText(/drop PDF here/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/watermark text/i)).not.toBeInTheDocument();
  });

  it('disables submission when the text is empty', async () => {
    renderWithProviders(<AddWatermark />);

    await uploadPdf();
    await user.clear(screen.getByLabelText(/watermark text/i));

    expect(submitButton()).toBeDisabled();
  });

  it('validates the page range inline', async () => {
    renderWithProviders(<AddWatermark />);

    await uploadPdf();
    const rangeInput = screen.getByLabelText(/^pages$/i);

    await user.type(rangeInput, 'abc');

    expect(screen.getByRole('alert')).toHaveTextContent(/page numbers or ranges/i);
    expect(rangeInput).toHaveAttribute('aria-invalid', 'true');
    expect(submitButton()).toBeDisabled();

    await user.clear(rangeInput);
    await user.type(rangeInput, '1-2');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it('switches to image mode and requires an image', async () => {
    renderWithProviders(<AddWatermark />);

    await uploadPdf();
    await user.click(screen.getByRole('radio', { name: /^image/i }));

    expect(screen.queryByLabelText(/watermark text/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/font size/i)).not.toBeInTheDocument();
    expect(screen.getByText(/PNG or JPEG only/i)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    const imageFile = generateDummyImage('mark.png', 400, 300, 'image/png');
    await user.upload(screen.getByLabelText(/watermark image/i), imageFile);

    expect(screen.getByText('mark.png')).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it('clears a chosen image and disables submission again', async () => {
    renderWithProviders(<AddWatermark />);

    await uploadPdf();
    await user.click(screen.getByRole('radio', { name: /^image/i }));
    const imageFile = generateDummyImage('mark.png', 400, 300, 'image/png');
    await user.upload(screen.getByLabelText(/watermark image/i), imageFile);

    await user.click(screen.getByRole('button', { name: /remove watermark image/i }));

    expect(screen.queryByText('mark.png')).not.toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('submits a text watermark with the chosen options', async () => {
    renderWithProviders(<AddWatermark />);

    await uploadPdf();

    fireEvent.change(screen.getByLabelText(/font size/i), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/opacity/i), { target: { value: '0.5' } });
    fireEvent.change(screen.getByLabelText(/rotation/i), { target: { value: '0' } });
    await user.type(screen.getByLabelText(/^pages$/i), '1-2');
    await user.click(submitButton());

    await waitFor(() => expect(addWatermarkMock).toHaveBeenCalledTimes(1));
    expect(addWatermarkMock).toHaveBeenCalledWith(expect.any(File), {
      text: 'CONFIDENTIAL',
      fontSize: 80,
      opacity: 0.5,
      rotation: 0,
      pageRange: '1-2',
    });

    expect(await screen.findByText(/watermark added successfully/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /download watermarked_test\.pdf/i }),
    ).toBeInTheDocument();
  });

  it('submits an image watermark with the detected image type', async () => {
    renderWithProviders(<AddWatermark />);

    await uploadPdf();
    await user.click(screen.getByRole('radio', { name: /^image/i }));
    const imageFile = generateDummyImage('mark.png', 400, 300, 'image/png');
    await user.upload(screen.getByLabelText(/watermark image/i), imageFile);
    await user.click(submitButton());

    await waitFor(() => expect(addWatermarkMock).toHaveBeenCalledTimes(1));
    expect(addWatermarkMock).toHaveBeenCalledWith(expect.any(File), {
      image: imageFile,
      opacity: 0.3,
      rotation: 45,
      imageType: 'png',
    });
  });

  it('shows the library error and stays on the configure step', async () => {
    addWatermarkMock.mockRejectedValueOnce(
      new Error('Watermark text must use Latin (WinAnsi) characters: the built-in PDF font cannot encode other scripts.'),
    );
    renderWithProviders(<AddWatermark />);

    await uploadPdf();
    await user.click(submitButton());

    expect(await screen.findByText(/cannot encode other scripts/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/watermark text/i)).toBeInTheDocument();
  });

  it('returns to the upload step from the download screen', async () => {
    renderWithProviders(<AddWatermark />);

    await uploadPdf();
    await user.click(submitButton());
    await screen.findByText(/watermark added successfully/i);

    await user.click(screen.getByRole('button', { name: /start over/i }));

    expect(screen.getByText(/drop PDF here/i)).toBeInTheDocument();
    expect(screen.queryByText(/watermark added successfully/i)).not.toBeInTheDocument();
  });

  it('keeps the existing select/remove aria labels', async () => {
    renderWithProviders(<AddWatermark />);

    expect(screen.getByLabelText(/select PDF file/i)).toHaveAttribute('type', 'file');
    await uploadPdf();
    expect(screen.getByRole('button', { name: /remove file/i })).toBeInTheDocument();
  });

  it('renders the page in Arabic when that locale is active', () => {
    useToolsStore.setState({ locale: 'ar' });
    renderWithProviders(<AddWatermark />);
    expect(screen.getByText('اختر ملف PDF')).toBeInTheDocument();
  });
});
