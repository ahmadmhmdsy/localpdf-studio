import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ToolLayout from './ToolLayout';

describe('ToolLayout', () => {
  it('renders title and description', () => {
    render(
      <ToolLayout title="Test Tool" description="This is a test description">
        <div>Tool content</div>
      </ToolLayout>
    );
    
    expect(screen.getByRole('heading', { name: 'Test Tool' })).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <ToolLayout title="Test Tool" description="Description">
        <div data-testid="child-content">Child content here</div>
      </ToolLayout>
    );
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child content here')).toBeInTheDocument();
  });

  it('has correct container structure', () => {
    const { container } = render(
      <ToolLayout title="Test Tool" description="Description">
        <div>Content</div>
      </ToolLayout>
    );
    
    expect(container.firstChild).toHaveClass('container');
  });
});
