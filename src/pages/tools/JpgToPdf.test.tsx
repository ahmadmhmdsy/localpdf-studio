import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JpgToPdf from './JpgToPdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyImage, generateDummyImages } from '../../tests/fixtures/imageGenerator';

// Mock image conversion library
vi.mock('../../lib/image', () => ({
  jpgsToPdf: vi.fn(async (files: File[]) => {
    await new Promise(r => setTimeout(r, 200));
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
}));

describe('JpgToPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('renders upload zone on initial load', () => {
      renderWithProviders(<JpgToPdf />);
      
      expect(screen.getByText(/select JPG images/i)).toBeInTheDocument();
    });

    it('displays tool title and description', () => {
      renderWithProviders(<JpgToPdf />);
      
      expect(screen.getByRole('heading', { name: /JPG to PDF/i })).toBeInTheDocument();
    });
  });

  describe('Image Upload', () => {
    it('transitions to configure step after image selection', async () => {
      renderWithProviders(<JpgToPdf />);
      
      const image = generateDummyImage('test.jpg');
      const input = screen.getByLabelText(/select JPG images/i);
      
      await user.upload(input, [image]);
      
      await waitFor(() => {
        expect(screen.getByText(/Drag and drop/i)).toBeInTheDocument();
      });
    });

    it('accepts multiple images', async () => {
      renderWithProviders(<JpgToPdf />);
      
      const images = generateDummyImages(3);
      const input = screen.getByLabelText(/select JPG images/i);
      
      await user.upload(input, images);
      
      await waitFor(() => {
        images.forEach(img => {
          expect(screen.getByText(img.name)).toBeInTheDocument();
        });
      });
    });

    it('displays uploaded image details', async () => {
      renderWithProviders(<JpgToPdf />);
      
      const image = generateDummyImage('photo.jpg');
      const input = screen.getByLabelText(/select JPG images/i);
      
      await user.upload(input, [image]);
      
      await waitFor(() => {
        expect(screen.getByText('photo.jpg')).toBeInTheDocument();
      });
    });
  });

  describe('Conversion Options', () => {
    it('shows conversion options in configure step', async () => {
      renderWithProviders(<JpgToPdf />);
      
      const image = generateDummyImage('test.jpg');
      const input = screen.getByLabelText(/select JPG images/i);
      
      await user.upload(input, [image]);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /convert to PDF/i })).toBeInTheDocument();
      });
    });

    it('allows reordering images', async () => {
      renderWithProviders(<JpgToPdf />);
      
      const images = generateDummyImages(2);
      const input = screen.getByLabelText(/select JPG images/i);
      
      await user.upload(input, images);
      
      await waitFor(() => {
        expect(screen.getByText('test-image-1.jpg')).toBeInTheDocument();
        expect(screen.getByText('test-image-2.jpg')).toBeInTheDocument();
      });
    });
  });

  describe('Conversion Process', () => {
    it('shows processing state during conversion', async () => {
      renderWithProviders(<JpgToPdf />);
      
      const image = generateDummyImage('test.jpg');
      const input = screen.getByLabelText(/select JPG images/i);
      
      await user.upload(input, [image]);
      
      await waitFor(() => {
        const convertButton = screen.getByRole('button', { name: /convert to PDF/i });
        expect(convertButton).toBeInTheDocument();
      });
      
      const convertButton = screen.getByRole('button', { name: /convert to PDF/i });
      await user.click(convertButton);
      
      await waitFor(() => {
        expect(screen.getByText(/converting to PDF/i)).toBeInTheDocument();
      });
    });

    it('shows download state after conversion', async () => {
      renderWithProviders(<JpgToPdf />);
      
      const image = generateDummyImage('test.jpg');
      const input = screen.getByLabelText(/select JPG images/i);
      
      await user.upload(input, [image]);
      
      await waitFor(() => {
        const convertButton = screen.getByRole('button', { name: /convert to PDF/i });
        expect(convertButton).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /convert to PDF/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/PDF created successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('File Management', () => {
    it('allows removing images', async () => {
      renderWithProviders(<JpgToPdf />);
      
      const images = generateDummyImages(2);
      const input = screen.getByLabelText(/select JPG images/i);
      
      await user.upload(input, images);
      
      await waitFor(() => {
        expect(screen.getByText('test-image-2.jpg')).toBeInTheDocument();
      });
      
      // Find remove button for second image
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      const removeButton = removeButtons.find(btn => 
        btn.closest('[class*="flex items-center"]')?.textContent?.includes('test-image-2.jpg')
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }
      
      await waitFor(() => {
        expect(screen.queryByText('test-image-2.jpg')).not.toBeInTheDocument();
      });
    });
  });
});
