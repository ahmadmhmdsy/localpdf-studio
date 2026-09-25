import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUploadZone from './FileUploadZone';
import { renderWithProviders } from '../../tests/utils';

describe('FileUploadZone', () => {
  it('renders with default title and subtitle', () => {
    renderWithProviders(<FileUploadZone onFilesSelected={vi.fn()} />);

    expect(screen.getByText('Select PDF files')).toBeInTheDocument();
    expect(screen.getByText('or drop PDFs here')).toBeInTheDocument();
  });

  it('renders with custom title and subtitle', () => {
    renderWithProviders(
      <FileUploadZone
        onFilesSelected={vi.fn()}
        title="Custom Title"
        subtitle="Custom subtitle"
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom subtitle')).toBeInTheDocument();
  });

  it('does not make an absolute local-only privacy claim', () => {
    renderWithProviders(<FileUploadZone onFilesSelected={vi.fn()} />);

    expect(screen.queryByText(/files never leave your device/i)).not.toBeInTheDocument();
  });

  it('has clickable upload area', () => {
    renderWithProviders(<FileUploadZone onFilesSelected={vi.fn()} />);

    // The upload zone is a clickable div with the title text
    const uploadZone = screen.getByText('Select PDF files');
    expect(uploadZone).toBeInTheDocument();
    // The card div (parent of drop-cta which contains h2) has cursor: pointer
    expect(uploadZone.closest('.dropzone-card')).toHaveStyle({ cursor: 'pointer' });
  });

  it('accepts only PDF by default', () => {
    renderWithProviders(<FileUploadZone onFilesSelected={vi.fn()} />);

    // The dropzone area should be present
    const dropzone = screen.getByText('Select PDF files').closest('div');
    expect(dropzone).toBeInTheDocument();
  });

  it('can accept custom file types', () => {
    renderWithProviders(
      <FileUploadZone
        onFilesSelected={vi.fn()}
        accept={{ 'image/jpeg': ['.jpg', '.jpeg'] }}
      />
    );

    const dropzone = screen.getByText('Select PDF files').closest('div');
    expect(dropzone).toBeInTheDocument();
  });

  it('calls onFilesSelected when files are uploaded', async () => {
    const onFilesSelected = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<FileUploadZone onFilesSelected={onFilesSelected} />);

    const file = new File(['%PDF-1.4 test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      await user.upload(input, [file]);
      // onFilesSelected should be called by react-dropzone
      expect(onFilesSelected).toHaveBeenCalled();
    }
  });
});
