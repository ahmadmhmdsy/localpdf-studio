import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScanToPdf from './ScanToPdf';
import { renderWithProviders } from '../../tests/utils';

vi.mock('../../lib/image', () => ({
  imagesToPdf: vi.fn(async (files: File[]) => {
    await new Promise(r => setTimeout(r, 200));
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('ScanToPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Mock camera API
    const mockStream = {
      getTracks: () => [],
      getVideoTracks: () => [],
      removeTrack: vi.fn(),
      addTrack: vi.fn(),
    };
    
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
    });
  });

  it('renders camera view on initial load', () => {
    renderWithProviders(<ScanToPdf />);
    expect(screen.getByRole('heading', { name: /scan to PDF/i })).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<ScanToPdf />);
    expect(screen.getByRole('heading', { name: /scan to PDF/i })).toBeInTheDocument();
  });

  it('shows capture button', () => {
    renderWithProviders(<ScanToPdf />);
    expect(screen.getByRole('button', { name: /capture image from camera/i })).toBeInTheDocument();
  });

  it('shows convert button after capturing images', async () => {
    renderWithProviders(<ScanToPdf />);
    
    // Mock canvas toDataURL to return a valid image
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,test');
    
    const captureButton = screen.getByRole('button', { name: /capture image from camera/i });
    await user.click(captureButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /convert to PDF/i })).toBeInTheDocument();
    });
  });
});
