import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StepTrack from './StepTrack';

describe('StepTrack', () => {
  it('renders one list item per step', () => {
    render(<StepTrack steps={['Upload', 'Configure', 'Download']} currentStep={0} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('renders the step labels', () => {
    render(<StepTrack steps={['One', 'Two', 'Three']} currentStep={1} />);
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
  });

  it('marks only the current step as aria-current="step"', () => {
    render(<StepTrack steps={['A', 'B', 'C']} currentStep={1} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0].getAttribute('aria-current')).toBeNull();
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[2].getAttribute('aria-current')).toBeNull();
  });

  it('marks done steps with the "done" class and active step with "active"', () => {
    const { container } = render(
      <StepTrack steps={['A', 'B', 'C']} currentStep={2} />
    );
    const items = container.querySelectorAll('.step-item');
    expect(items[0].className).toContain('done');
    expect(items[0].className).not.toContain('active');
    expect(items[1].className).toContain('done');
    expect(items[1].className).not.toContain('active');
    expect(items[2].className).toContain('active');
    expect(items[2].className).not.toContain('done');
  });

  it('exposes a progress list label for screen readers', () => {
    render(<StepTrack steps={['X', 'Y']} currentStep={0} />);
    expect(screen.getByRole('list', { name: /progress steps/i })).toBeInTheDocument();
  });

  it('handles a single-step track without crashing', () => {
    render(<StepTrack steps={['Only']} currentStep={0} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});