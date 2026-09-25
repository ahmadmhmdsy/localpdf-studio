import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PowerpointToPdf from './PowerpointToPdf';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyPptx } from '../../tests/fixtures/officeGenerator';

const { convertPowerpointToPdfMock } = vi.hoisted(() => ({
  convertPowerpointToPdfMock: vi.fn(),
}));

vi.mock('../../lib/office-pptx', () => ({
  convertPowerpointToPdf: convertPowerpointToPdfMock,
}));

describe('PowerpointToPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    convertPowerpointToPdfMock.mockReset();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<PowerpointToPdf />);
    expect(screen.getByText(/select a PowerPoint file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<PowerpointToPdf />);
    expect(screen.getByRole('heading', { name: /POWERPOINT to PDF/i })).toBeInTheDocument();
  });

  it('shows processing and completes when conversion resolves', async () => {
    renderWithProviders(<PowerpointToPdf />);

    const pptxFile = generateDummyPptx('presentation.pptx');
    const input = screen.getByLabelText(/select PowerPoint file/i);
    const conversion = createDeferred<Uint8Array>();
    const result = new Uint8Array([1, 2, 3, 4, 5]);
    convertPowerpointToPdfMock.mockReturnValueOnce(conversion.promise);

    await user.upload(input, pptxFile);

    expect(await screen.findByText(/converting presentation/i)).toBeInTheDocument();
    expect(convertPowerpointToPdfMock).toHaveBeenCalledWith(pptxFile);

    await act(async () => {
      conversion.resolve(result);
      await conversion.promise;
    });

    expect(await screen.findByText(/conversion successful!/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
  });
});
