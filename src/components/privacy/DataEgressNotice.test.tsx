import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataEgressNotice from './DataEgressNotice';

describe('DataEgressNotice', () => {
  it('identifies browser-local processing for a local-only tool', () => {
    render(<DataEgressNotice toolId="merge-pdf" />);
    expect(screen.getByRole('note', { name: 'Data handling' })).toHaveTextContent(
      /processed in your browser/i
    );
    expect(screen.getByRole('note', { name: 'Data handling' })).not.toHaveTextContent(
      /never leave/i
    );
  });

  it('names the external destination and unavailable state for AI', () => {
    render(<DataEgressNotice toolId="ai-summarizer" />);
    expect(screen.getByRole('note', { name: 'Data handling' })).toHaveTextContent(
      /unavailable in the public beta/i
    );
    expect(screen.getByRole('note', { name: 'Data handling' })).toHaveTextContent(
      /Google Gemini/i
    );
  });

  it('identifies camera access without requesting it', () => {
    render(<DataEgressNotice toolId="scan-to-pdf" />);
    expect(screen.getByRole('note', { name: 'Data handling' })).toHaveTextContent(
      /camera access is not requested/i
    );
  });
});
