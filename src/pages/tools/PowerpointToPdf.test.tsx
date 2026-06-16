import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PowerpointToPdf from './PowerpointToPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPptx } from '../../tests/fixtures/officeGenerator';

vi.mock('../../lib/office-pptx', () => ({
  convertPowerpointToPdf: vi.fn(async (file: File) => {
    await new Promise(r => setTimeout(r, 200));
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('PowerpointToPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
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

  it('accepts PPTX file upload', async () => {
    renderWithProviders(<PowerpointToPdf />);
    
    const pptxFile = generateDummyPptx('presentation.pptx');
    const input = screen.getByLabelText(/select PowerPoint file/i);
    
    await user.upload(input, pptxFile);
    
    await waitFor(() => {
      expect(screen.getByText(/converting presentation/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
