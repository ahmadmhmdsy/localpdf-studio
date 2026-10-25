import { useCallback } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { isTauri, saveFile } from '../../lib/native';
import { logError } from '../../lib/logger';
import { useI18n } from '../../i18n/useI18n';

interface DownloadStateProps {
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
  onStartOver: () => void;
  title?: string;
  description?: string;
}

export default function DownloadState({
  fileName,
  fileUrl,
  fileSize,
  onStartOver,
  title,
  description,
}: DownloadStateProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const resolvedTitle = title ?? t('chrome.download.defaultTitle');
  const resolvedDescription = description ?? t('chrome.download.defaultDescription');

  /**
   * Resolve the file blob behind fileUrl (which may be a blob: URL or any
   * URL the browser can fetch) to a Uint8Array suitable for native fs write.
   */
  const fetchBytes = useCallback(async (): Promise<Uint8Array | null> => {
    if (!fileUrl) return null;
    try {
      const res = await fetch(fileUrl);
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    } catch (err) {
      logError('Failed to read fileUrl for native save:', err);
      return null;
    }
  }, [fileUrl]);

  /**
   * Save the file via the OS-native save dialog when in Tauri, otherwise
   * fall back to the standard <a download> flow.
   */
  const handleDownload = useCallback(async () => {
    if (!fileUrl) return;
    if (!isTauri()) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    const bytes = await fetchBytes();
    if (!bytes) {
      showToast({
        message: t('chrome.download.readFailed'),
        type: 'error',
        duration: 4000,
      });
      return;
    }
    try {
      const ext = (fileName || 'document.pdf').split('.').pop() || 'pdf';
      const saved = await saveFile({
        defaultName: fileName || 'document.pdf',
        extensions: [ext],
        title: t('chrome.download.saveTitle'),
        data: bytes,
      });
      if (saved) {
        showToast({
          message: t('chrome.download.saved', { path: saved }),
          type: 'success',
          duration: 3000,
        });
      }
    } catch (err) {
      showToast({
        message: t('chrome.download.saveFailed', {
          message: err instanceof Error ? err.message : String(err),
        }),
        type: 'error',
        duration: 5000,
      });
    }
  }, [fileUrl, fileName, fetchBytes, showToast, t]);

  return (
    <div
      className="download-state"
      style={{
        width: '100%',
        maxWidth: '680px',
        animation: 'fade-up 400ms cubic-bezier(0.32,0.72,0,1) both',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="download-card"
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(110,224,199,0.2)',
          borderRadius: 'var(--radius-xl)',
          padding: '56px 48px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 0 60px -20px rgba(110,224,199,0.15)',
          animation: 'download-enter 450ms cubic-bezier(0.32,0.72,0,1) both',
        }}
      >
        <div
          style={{
            content: '',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(110,224,199,0.04) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        <div
          className="success-icon"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(110,224,199,0.12)',
            border: '1px solid rgba(110,224,199,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
            animation: 'success-pop 400ms cubic-bezier(0.32,0.72,0,1) both',
          }}
        >
          <svg
            viewBox="0 0 36 36"
            style={{ width: '36px', height: '36px', color: 'var(--accent-2)', overflow: 'visible' }}
          >
            <path
              className="check-path"
              d="M8 18 L15 25 L28 11"
              fill="none"
              stroke="var(--accent-2)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="30"
              strokeDashoffset="30"
              style={{
                animation: 'check-draw 500ms 350ms cubic-bezier(0.32,0.72,0,1) forwards',
              }}
            />
          </svg>
        </div>

        <h2
          className="download-title"
          style={{
            fontFamily: 'sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '8px',
            color: 'var(--text)',
          }}
        >
          {resolvedTitle}
        </h2>

        <p
          style={{
            color: 'var(--text-3)',
            fontSize: '14px',
            marginBottom: '6px',
            fontFamily: 'sans-serif',
          }}
        >
          {resolvedDescription}
        </p>

        {fileSize && (
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              color: 'var(--text-2)',
              marginBottom: '32px',
            }}
          >
            {fileSize}
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {fileUrl ? (
            <a
              href={isTauri() ? undefined : fileUrl}
              download={isTauri() ? undefined : (fileName || 'document.pdf')}
              onClick={(e) => {
                if (isTauri()) {
                  e.preventDefault();
                  void handleDownload();
                }
              }}
              className="btn-download"
              role="link"
              style={{
                background: 'var(--accent-2)',
                color: '#0a1a16',
                padding: '15px 36px',
                borderRadius: '100px',
                fontWeight: 700,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 150ms, box-shadow 150ms',
                minHeight: '48px',
                boxShadow: '0 4px 20px -4px rgba(110,224,199,0.4)',
                textDecoration: 'none',
              }}
            >
              <Download size={18} />
              {fileName
                ? t('chrome.download.buttonNamed', { name: fileName })
                : t('chrome.download.button')}
            </a>
          ) : (
            <button
              className="btn-download"
              onClick={() => void handleDownload()}
              style={{
                background: 'var(--accent-2)',
                color: '#0a1a16',
                padding: '15px 36px',
                borderRadius: '100px',
                fontWeight: 700,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 150ms, box-shadow 150ms',
                minHeight: '48px',
                boxShadow: '0 4px 20px -4px rgba(110,224,199,0.4)',
              }}
            >
              <Download size={18} />
              {t('chrome.download.button')}
            </button>
          )}

          <button
            className="btn-new"
            onClick={onStartOver}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              padding: '14px 20px',
              borderRadius: '100px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all var(--transition)',
              minHeight: '48px',
            }}
          >
            <RotateCcw size={16} />
            {t('chrome.download.startOver')}
          </button>
        </div>
      </div>
    </div>
  );
}
