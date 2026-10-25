import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JpgToPdf from './JpgToPdf';
import { createDeferred, renderWithProviders } from '../../tests/utils';
import { generateDummyImage, generateDummyImages } from '../../tests/fixtures/imageGenerator';

const { convertImagesToPdfMock } = vi.hoisted(() => ({
  convertImagesToPdfMock: vi.fn(),
}));

// Mock image conversion library
vi.mock('../../lib/image', () => ({
  convertImagesToPdf: convertImagesToPdfMock,
}));

describe('JpgToPdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    convertImagesToPdfMock.mockReset();
    convertImagesToPdfMock.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3, 4, 5]),
      skipped: [],
    });
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

  describe('Page Layout Controls', () => {
    const uploadImage = async () => {
      const image = generateDummyImage('test.jpg');
      const input = screen.getByLabelText(/select JPG images/i);
      await user.upload(input, [image]);
      await screen.findByRole('button', { name: /convert to PDF/i });
      return image;
    };

    it('defaults to image-sized pages and hides the fit control', async () => {
      renderWithProviders(<JpgToPdf />);
      await uploadImage();

      expect(screen.getByLabelText(/page size/i)).toHaveValue('image');
      expect(screen.queryByLabelText(/image fit/i)).not.toBeInTheDocument();

      expect(screen.getByRole('option', { name: 'Image size' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'A4' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Letter' })).toBeInTheDocument();
    });

    it('shows the fit control for fixed page sizes and passes both options to the conversion', async () => {
      renderWithProviders(<JpgToPdf />);
      const image = await uploadImage();

      await user.selectOptions(screen.getByLabelText(/page size/i), 'a4');
      const fitSelect = screen.getByLabelText(/image fit/i);
      expect(fitSelect).toHaveValue('contain');

      await user.selectOptions(fitSelect, 'fill');
      await user.click(screen.getByRole('button', { name: /convert to PDF/i }));

      await waitFor(() => {
        expect(convertImagesToPdfMock).toHaveBeenCalledWith([image], {
          pageSize: 'a4',
          fit: 'fill',
        });
      });
    });

    it('lists skipped files after a partial conversion', async () => {
      convertImagesToPdfMock.mockResolvedValue({
        bytes: new Uint8Array([1, 2, 3]),
        skipped: ['broken.webp'],
      });
      renderWithProviders(<JpgToPdf />);
      await uploadImage();

      await user.click(screen.getByRole('button', { name: /convert to PDF/i }));

      expect(await screen.findByText(/some images were skipped/i)).toBeInTheDocument();
      expect(screen.getByText(/broken\.webp/)).toBeInTheDocument();
    });

    it('shows no skipped note when every image converts', async () => {
      renderWithProviders(<JpgToPdf />);
      await uploadImage();

      await user.click(screen.getByRole('button', { name: /convert to PDF/i }));

      expect(await screen.findByText(/PDF created successfully/i)).toBeInTheDocument();
      expect(screen.queryByText(/some images were skipped/i)).not.toBeInTheDocument();
    });

    it('shows the conversion error and returns to the configure step', async () => {
      convertImagesToPdfMock.mockRejectedValueOnce(
        new Error('Could not convert these files because they could not be read as JPEG or PNG images: broken.webp')
      );
      renderWithProviders(<JpgToPdf />);
      await uploadImage();

      await user.click(screen.getByRole('button', { name: /convert to PDF/i }));

      expect(await screen.findByText(/could not be read as JPEG or PNG images/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /convert to PDF/i })).toBeInTheDocument();
    });
  });

  describe('Conversion Process', () => {
    it('shows processing and completes when conversion resolves', async () => {
      renderWithProviders(<JpgToPdf />);

      const image = generateDummyImage('test.jpg');
      const input = screen.getByLabelText(/select JPG images/i);
      const conversion = createDeferred<{ bytes: Uint8Array; skipped: string[] }>();
      const result = new Uint8Array([1, 2, 3, 4, 5]);
      convertImagesToPdfMock.mockReturnValueOnce(conversion.promise);

      await user.upload(input, [image]);

      const convertButton = await screen.findByRole('button', { name: /convert to PDF/i });
      await user.click(convertButton);

      expect(await screen.findByText('Converting to PDF...')).toBeInTheDocument();
      expect(convertImagesToPdfMock).toHaveBeenCalledWith([image], {
        pageSize: 'image',
        fit: 'contain',
      });

      await act(async () => {
        conversion.resolve({ bytes: result, skipped: [] });
        await conversion.promise;
      });

      expect(await screen.findByText('PDF created successfully!')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /download images\.pdf/i })).toHaveAttribute('href', 'mock-url');
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
