import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../tests/utils';
import ApiKeySettings from './ApiKeySettings';

vi.mock('../../lib/native', () => ({
  API_KEY_CHANGED_EVENT: 'localpdf:api-key-changed',
  deleteStoreValue: vi.fn(),
  emitApiKeyChanged: vi.fn(),
  getStoreValue: vi.fn().mockResolvedValue(null),
  isTauri: () => false,
  setStoreValue: vi.fn(),
}));

vi.mock('../../lib/ai', () => ({
  clearApiKeyCache: vi.fn(),
  getCachedApiKey: () => null,
  resolveApiKey: vi.fn().mockResolvedValue(null),
}));

describe('ApiKeySettings in the browser', () => {
  it('reports no key and states that web AI tools are unavailable', async () => {
    renderWithProviders(<ApiKeySettings open onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Status: not configured/)).toBeInTheDocument();
    });
    expect(
      screen.getByText('AI tools are unavailable in the public web beta. No API key is stored in the browser.')
    ).toBeInTheDocument();
  });

  it('never offers a build-time web key configuration path', () => {
    renderWithProviders(<ApiKeySettings open onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).not.toMatch(/VITE_GEMINI_API_KEY/);
    expect(dialog.textContent).not.toMatch(/configured \(env\)/);
    expect(dialog.textContent).not.toMatch(/\.env/i);
  });
});
