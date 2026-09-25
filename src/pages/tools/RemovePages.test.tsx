import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RemovePages from './RemovePages';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

const { removePagesMock } = vi.hoisted(() => ({
  removePagesMock: vi.fn(),
}));

vi.mock('../../lib/pdf', () => ({
  removePages: removePagesMock,
}));

describe('RemovePages', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    removePagesMock.mockReset();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<RemovePages />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<RemovePages />);
    expect(screen.getByRole('heading', { name: /remove pages/i })).toBeInTheDocument();
  });

  it('transitions to configure step after file selection', async () => {
    renderWithProviders(<RemovePages />);
    
    const pdfFile = await generateDummyPdf(5, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/pages to remove/i)).toBeInTheDocument();
    });
  });

  it('processes removal and exposes the completed PDF', async () => {
    renderWithProviders(<RemovePages />);

    const pdfFile = await generateDummyPdf(5, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    const removal = createDeferred<Uint8Array>();
    removePagesMock.mockReturnValueOnce(removal.promise);

    await user.upload(input, pdfFile);

    const rangeInput = await screen.findByLabelText(/pages to remove/i);
    await user.type(rangeInput, '1-2');

    const removeButton = screen.getByRole('button', { name: /remove pages/i });
    expect(removeButton).toBeEnabled();

    await user.click(removeButton);

    expect(await screen.findByText(/removing pages/i)).toBeInTheDocument();
    expect(removePagesMock).toHaveBeenCalledWith(pdfFile, '1-2');

    await act(async () => {
      removal.resolve(new Uint8Array([1, 2, 3, 4, 5]));
      await removal.promise;
    });

    expect(await screen.findByText(/pages removed successfully/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download removed_test\.pdf/i })).toHaveAttribute(
      'href',
      'mock-url'
    );
  });
});
