import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DownloadState from './DownloadState';

describe('DownloadState', () => {
  const defaultProps = {
    title: 'Download Ready',
    description: 'Your file is ready for download',
    fileName: 'test.pdf',
    fileUrl: 'blob:mock-url',
    fileSize: '1.5 MB',
    onStartOver: vi.fn(),
  };

  it('renders with provided title and description', () => {
    render(<DownloadState {...defaultProps} />);
    
    expect(screen.getByText('Download Ready')).toBeInTheDocument();
    expect(screen.getByText('Your file is ready for download')).toBeInTheDocument();
  });

  it('displays file information', () => {
    render(<DownloadState {...defaultProps} />);

    // File name is shown in the download link
    expect(screen.getByText(/test\.pdf/)).toBeInTheDocument();
    expect(screen.getByText('1.5 MB')).toBeInTheDocument();
  });

  it('has download link', () => {
    render(<DownloadState {...defaultProps} />);

    const downloadLink = screen.getByRole('link', { name: /download/i });
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink).toHaveAttribute('href', 'blob:mock-url');
    expect(downloadLink).toHaveAttribute('download', 'test.pdf');
  });

  it('has start over button', () => {
    render(<DownloadState {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();
  });

  it('calls onStartOver when start over button is clicked', async () => {
    const onStartOver = vi.fn();
    const user = userEvent.setup();
    
    render(<DownloadState {...defaultProps} onStartOver={onStartOver} />);
    
    const startOverButton = screen.getByRole('button', { name: /start over/i });
    await user.click(startOverButton);
    
    expect(onStartOver).toHaveBeenCalled();
  });
});
