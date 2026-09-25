import { useCallback, useEffect, useState } from 'react';
import { X, Key, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import {
  API_KEY_CHANGED_EVENT,
  deleteStoreValue,
  emitApiKeyChanged,
  getStoreValue,
  isTauri,
  setStoreValue,
} from '../../lib/native';
import { clearApiKeyCache, resolveApiKey } from '../../lib/ai';
import { cn } from '../../lib/utils';

interface ApiKeySettingsProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal dialog for managing the Gemini API key in the desktop app.
 *
 * Persistence strategy:
 *   - Tauri: stored in tauri-plugin-store (settings.json, key: geminiApiKey).
 *   - Web: no persistence and no build-time key. AI tools are unavailable in
 *     the public web beta, so the dialog is informational in the browser.
 */
export default function ApiKeySettings({ open, onClose }: ApiKeySettingsProps) {
  const { showToast } = useToast();
  const [keyInput, setKeyInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!isTauri()) {
      // No build-time web key exists: the public bundle can never hold one.
      setHasKey(false);
      return;
    }
    const v = await getStoreValue<string>('geminiApiKey');
    setHasKey(Boolean(v && v.trim()));
  }, []);

  useEffect(() => {
    if (!open) return;
    void refreshStatus();
  }, [open, refreshStatus]);

  // Cross-component invalidation: re-check status when another component
  // dispatches the api-key-changed event.
  useEffect(() => {
    const handler = () => void refreshStatus();
    window.addEventListener(API_KEY_CHANGED_EVENT, handler);
    return () => window.removeEventListener(API_KEY_CHANGED_EVENT, handler);
  }, [refreshStatus]);

  const handleSave = useCallback(async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      showToast({ message: 'Please paste a non-empty API key.', type: 'error', duration: 3000 });
      return;
    }
    setBusy(true);
    try {
      await setStoreValue('geminiApiKey', trimmed);
      clearApiKeyCache();
      // Pre-populate the in-memory cache so a sync getGenAI() works immediately.
      await resolveApiKey();
      emitApiKeyChanged();
      setSaved(true);
      setHasKey(true);
      setKeyInput('');
      showToast({ message: 'Gemini API key saved.', type: 'success', duration: 2500 });
      // Close after a short beat so the user sees the success state.
      window.setTimeout(() => {
        setSaved(false);
        onClose();
      }, 700);
    } catch (err) {
      showToast({
        message: 'Failed to save key: ' + (err instanceof Error ? err.message : String(err)),
        type: 'error',
        duration: 5000,
      });
    } finally {
      setBusy(false);
    }
  }, [keyInput, onClose, showToast]);

  const handleDelete = useCallback(async () => {
    setBusy(true);
    try {
      await deleteStoreValue('geminiApiKey');
      clearApiKeyCache();
      emitApiKeyChanged();
      setHasKey(false);
      showToast({ message: 'API key removed.', type: 'success', duration: 2500 });
    } catch (err) {
      showToast({
        message: 'Failed to delete key: ' + (err instanceof Error ? err.message : String(err)),
        type: 'error',
        duration: 5000,
      });
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-settings-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: '20px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.5)',
          animation: 'fade-up 250ms cubic-bezier(0.32,0.72,0,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Key size={20} aria-hidden="true" style={{ color: 'var(--accent)' }} />
          <h2
            id="api-key-settings-title"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '18px', fontWeight: 700 }}
          >
            Gemini API Key
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none',
              color: 'var(--text-2)', cursor: 'pointer', padding: '4px', borderRadius: '8px',
            }}
          >
            <X size={18} />
          </button>
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '20px' }}>
          {isTauri()
            ? 'Stored locally in the app’s secure store. Used only for AI tools.'
            : 'AI tools are unavailable in the public web beta. No API key is stored in the browser.'}
        </p>

        {!isTauri() ? (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px 16px',
            fontFamily: "'DM Mono', monospace",
            fontSize: '12px',
            color: 'var(--text-2)',
          }}>
            <div>Status: not configured</div>
          </div>
        ) : (
          <>
            <label htmlFor="api-key-input" style={{ display: 'block', fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px' }}>
              {hasKey ? 'Replace key' : 'Enter your key'}
            </label>
            <input
              id="api-key-input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              aria-label="Gemini API key"
              style={{
                width: '100%', padding: '12px 14px', fontSize: '14px',
                background: 'rgba(0,0,0,0.25)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '12px',
                outline: 'none', fontFamily: "'DM Mono', monospace",
              }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px', justifyContent: 'flex-end' }}>
              {hasKey && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={busy}
                  className={cn('btn')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '10px 16px', borderRadius: '100px',
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--text-2)', cursor: busy ? 'wait' : 'pointer',
                    fontSize: '13px', fontFamily: 'inherit',
                  }}
                  aria-label="Delete saved API key"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Remove saved key
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={busy}
                className={cn('btn', saved && 'btn-saved')}
                style={{
                  padding: '10px 22px', borderRadius: '100px',
                  background: saved ? 'var(--accent-2)' : 'var(--text)',
                  color: saved ? '#0a1a16' : 'var(--bg)',
                  border: 'none', cursor: busy ? 'wait' : 'pointer',
                  fontSize: '13px', fontFamily: 'inherit', fontWeight: 600,
                  transition: 'all 200ms',
                }}
              >
                {saved ? 'Saved' : busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
