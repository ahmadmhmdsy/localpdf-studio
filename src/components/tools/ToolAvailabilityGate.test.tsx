import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import ToolAvailabilityGate from './ToolAvailabilityGate';
import { renderWithProviders } from '../../tests/utils';

const DISABLED_IDS = [
  'scan-to-pdf', 'compress-pdf', 'ocr-pdf', 'pdf-to-powerpoint',
  'blackout-pdf', 'decrypt-pdf', 'protect-pdf', 'ai-summarizer',
  'translate-pdf',
] as const;

const BANNED_PHRASES = [
  'success', 'secure', 'security', 'complet', '100% local', 'never leave',
];

describe('ToolAvailabilityGate', () => {
  it('renders children unchanged for stable tools', () => {
    renderWithProviders(
      <ToolAvailabilityGate toolId="merge-pdf" toolName="Merge PDF">
        <div>WORKFLOW_CONTENT</div>
      </ToolAvailabilityGate>
    );
    expect(screen.getByText('WORKFLOW_CONTENT')).toBeInTheDocument();
    // No limitation alert, no unavailable state
    expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/limitation/i)).not.toBeInTheDocument();
  });

  it('renders children plus a visible limitation alert for limited tools', () => {
    renderWithProviders(
      <ToolAvailabilityGate toolId="split-pdf" toolName="Split PDF">
        <div>WORKFLOW_CONTENT</div>
      </ToolAvailabilityGate>
    );
    expect(screen.getByText('WORKFLOW_CONTENT')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Produces one extracted PDF, not a set of independent files as users may expect.'
      )
    ).toBeInTheDocument();
  });

  it('does not render the workflow and shows a truthful unavailable screen for disabled tools', () => {
    renderWithProviders(
      <ToolAvailabilityGate toolId="protect-pdf" toolName="Protect PDF">
        <div>WORKFLOW_CONTENT</div>
      </ToolAvailabilityGate>
    );
    // The disabled workflow must never be mounted
    expect(screen.queryByText('WORKFLOW_CONTENT')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /unavailable/i })).toBeInTheDocument();
    // Shows the tool name and registry limitation
    expect(screen.getAllByText(/Protect PDF/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Protection is a no-op/i)).toBeInTheDocument();
    // Truthful: no success/security/local-processing claims on this screen
    const body = document.body.textContent || '';
    expect(body.toLowerCase()).not.toContain('success');
    expect(body.toLowerCase()).not.toContain('secure');
    expect(body.toLowerCase()).not.toContain('complet');
    // Provides a way back Home
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
  });

  it('shows an unavailable screen for every disabled tool without mounting the workflow', () => {
    for (const toolId of DISABLED_IDS) {
      const { unmount } = renderWithProviders(
        <ToolAvailabilityGate toolId={toolId} toolName="Any Tool">
          <div>WORKFLOW_CONTENT</div>
        </ToolAvailabilityGate>
      );
      expect(screen.queryByText('WORKFLOW_CONTENT')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /unavailable/i })).toBeInTheDocument();
      const body = document.body.textContent || '';
      for (const phrase of BANNED_PHRASES) {
        expect(
          body.toLowerCase(),
          'unavailable screen for tool ' + toolId + ' must not claim "' + phrase + '"'
        ).not.toContain(phrase);
      }
      unmount();
    }
  });
});
