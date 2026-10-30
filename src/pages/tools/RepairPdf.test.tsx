import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RepairPdf from './RepairPdf';
import { renderWithProviders, createDeferred } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';
import { repairPdf, type RepairResult } from '../../lib/repair';
import { saveAs } from 'file-saver';
import { useToolsStore } from '../../store/toolsStore';

vi.mock('../../lib/repair', () => ({
  repairPdf: vi.fn(),
}));

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

const successResult: RepairResult = {
  success: true,
  data: new Uint8Array([1, 2, 3]),
  issuesFixed: [{ code: 'structure-validated' }],
};

const failureResult: RepairResult = {
  success: false,
  data: null,
  issuesFixed: [],
};

async function uploadPdf(user: ReturnType<typeof userEvent.setup>, name = 'test.pdf') {
  const pdfFile = await generateDummyPdf(3, name);
  const input = screen.getByLabelText(/select PDF file/i);
  await user.upload(input, pdfFile);
}

describe('RepairPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    useToolsStore.setState({ locale: 'en' });
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<RepairPdf />);
    expect(screen.getByText(/select a corrupted PDF/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<RepairPdf />);
    expect(screen.getByRole('heading', { name: /repair PDF/i })).toBeInTheDocument();
  });

  it('shows the processing state while repairing', async () => {
    const deferred = createDeferred<RepairResult>();
    vi.mocked(repairPdf).mockReturnValueOnce(deferred.promise);

    renderWithProviders(<RepairPdf />);
    await uploadPdf(user);

    expect(
      await screen.findByRole('status', { name: /processing your files/i }),
    ).toBeInTheDocument();

    deferred.resolve(successResult);
    expect(await screen.findByText(/repair successful/i)).toBeInTheDocument();
  });

  it('shows the success state and a download after a successful repair', async () => {
    vi.mocked(repairPdf).mockResolvedValueOnce(successResult);

    renderWithProviders(<RepairPdf />);
    await uploadPdf(user);

    expect(await screen.findByText(/repair successful/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF repaired successfully. Fixed 1 issue/)).toBeInTheDocument();
    expect(screen.getByText('Validated PDF structure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download repaired pdf/i })).toBeInTheDocument();
  });

  it('downloads the repaired file under the repaired name', async () => {
    vi.mocked(repairPdf).mockResolvedValueOnce(successResult);

    renderWithProviders(<RepairPdf />);
    await uploadPdf(user, 'damaged.pdf');

    await user.click(await screen.findByRole('button', { name: /download repaired pdf/i }));

    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'damaged_repaired.pdf');
  });

  it('shows an error and a toast with no download when the PDF cannot be repaired', async () => {
    vi.mocked(repairPdf).mockResolvedValueOnce(failureResult);

    renderWithProviders(<RepairPdf />);
    await uploadPdf(user, 'broken.pdf');

    expect(await screen.findByText(/repair failed/i)).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/too damaged to repair/i);
    expect(
      screen.queryByRole('button', { name: /download repaired pdf/i }),
    ).not.toBeInTheDocument();
    expect(saveAs).not.toHaveBeenCalled();

    const notifications = screen.getByRole('region', { name: /notifications/i });
    await waitFor(() =>
      expect(notifications).toHaveTextContent(/no repaired file was produced/i),
    );
  });

  it('never offers a download for a failed result, even if it carries data', async () => {
    vi.mocked(repairPdf).mockResolvedValueOnce({
      success: false,
      data: new Uint8Array([9, 9, 9]),
      issuesFixed: [],
    });

    renderWithProviders(<RepairPdf />);
    await uploadPdf(user, 'broken.pdf');

    expect(await screen.findByText(/repair failed/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /download repaired pdf/i }),
    ).not.toBeInTheDocument();
    expect(saveAs).not.toHaveBeenCalled();
  });

  it('shows the error state when repairPdf throws', async () => {
    vi.mocked(repairPdf).mockRejectedValueOnce(new Error('Unexpected parser crash'));

    renderWithProviders(<RepairPdf />);
    await uploadPdf(user);

    expect(await screen.findByText(/repair failed/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Unexpected parser crash/);
    expect(
      screen.queryByRole('button', { name: /download repaired pdf/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the repair flow in Arabic when that locale is active', async () => {
    vi.mocked(repairPdf).mockResolvedValueOnce(successResult);
    useToolsStore.setState({ locale: 'ar' });

    renderWithProviders(<RepairPdf />);

    expect(screen.getByRole('heading', { name: 'إصلاح PDF' })).toBeInTheDocument();
    expect(screen.getByText('اختر ملف PDF تالفًا')).toBeInTheDocument();

    const pdfFile = await generateDummyPdf(3, 'test.pdf');
    await user.upload(screen.getByLabelText('اختر ملف PDF'), pdfFile);

    expect(await screen.findByText('تم الإصلاح بنجاح!')).toBeInTheDocument();
    expect(screen.getByText('تم التحقق من بنية PDF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تنزيل ملف PDF المُصلح' })).toBeInTheDocument();
  });

  it('returns to the upload zone after a failure', async () => {
    vi.mocked(repairPdf).mockResolvedValueOnce(failureResult);

    renderWithProviders(<RepairPdf />);
    await uploadPdf(user);

    await user.click(await screen.findByRole('button', { name: /try again/i }));

    expect(screen.getByText(/select a corrupted PDF/i)).toBeInTheDocument();
  });
});
