import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProcessingState from './ProcessingState';

describe('ProcessingState', () => {
  it('renders with default title and description', () => {
    render(<ProcessingState />);
    
    expect(screen.getByText('Processing your files')).toBeInTheDocument();
  });

  it('renders with custom title and description', () => {
    render(
      <ProcessingState 
        title="Merging PDFs..." 
        description="Please wait while we combine your documents"
      />
    );
    
    expect(screen.getByText('Merging PDFs...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we combine your documents')).toBeInTheDocument();
  });

  it('displays loading indicator', () => {
    render(<ProcessingState />);
    
    expect(screen.getByText('Processing your files')).toBeInTheDocument();
  });
});
