import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolErrorBoundary from './ToolErrorBoundary';

const Thrower = () => {
  throw new Error('Tool error');
};

describe('ToolErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <ToolErrorBoundary>
        <div>Tool content</div>
      </ToolErrorBoundary>
    );
    expect(screen.getByText('Tool content')).toBeInTheDocument();
  });

  it('displays error UI with tool name when child throws', () => {
    render(
      <ToolErrorBoundary toolName="Merge PDF">
        <Thrower />
      </ToolErrorBoundary>
    );
    expect(screen.getByText(/Merge PDF encountered an error/i)).toBeInTheDocument();
  });

  it('shows default tool name when not provided', () => {
    render(
      <ToolErrorBoundary>
        <Thrower />
      </ToolErrorBoundary>
    );
    expect(screen.getByText(/This tool encountered an error/i)).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <ToolErrorBoundary>
        <Thrower />
      </ToolErrorBoundary>
    );
    expect(screen.getByText('Tool error')).toBeInTheDocument();
  });

  it('shows try again button', () => {
    render(
      <ToolErrorBoundary>
        <Thrower />
      </ToolErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows all tools button', () => {
    render(
      <ToolErrorBoundary>
        <Thrower />
      </ToolErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /all tools/i })).toBeInTheDocument();
  });

  it('resets error state on try again click', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;
    const ConditionalThrower = () => {
      if (shouldThrow) throw new Error('Tool error');
      return <div>Recovered</div>;
    };

    render(
      <ToolErrorBoundary>
        <ConditionalThrower />
      </ToolErrorBoundary>
    );

    expect(screen.getByText(/This tool encountered an error/i)).toBeInTheDocument();
    
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));
    
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });
});
