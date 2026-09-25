import { useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { Upload, FolderOpen } from 'lucide-react';
import { cn, sanitizeFilename } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { PDF_ACCEPT } from '../../types/dropzone';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../../constants/limits';
import { isTauri, pickFilesAsFiles } from '../../lib/native';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  accept?: Accept;
  maxFiles?: number;
  ariaLabel?: string;
  maxSize?: number;
}

export default function FileUploadZone({
  onFilesSelected,
  title = "Select PDF files",
  subtitle = "or drop PDFs here",
  accept = PDF_ACCEPT,
  maxFiles = 0,
  ariaLabel = "Select PDF files",
  maxSize = MAX_FILE_SIZE_BYTES
}: FileUploadZoneProps) {
  const { showToast } = useToast();

  const validateMagicBytes = useCallback(async (file: File): Promise<boolean> => {
    const pdfExtensions = ['.pdf'];
    const isPdf = pdfExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isPdf) return true;

    try {
      const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
    } catch {
      return false;
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles: File[] = [];

    for (const file of acceptedFiles) {
      if (file.size > maxSize) {
        const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
        showToast({
          message: `File "${file.name}" exceeds the ${sizeMB}MB size limit`,
          type: 'error',
          duration: 5000,
        });
        continue;
      }

      const isValid = await validateMagicBytes(file);
      if (!isValid) {
        showToast({
          message: `File "${file.name}" appears to be corrupted or not a valid PDF`,
          type: 'error',
          duration: 5000,
        });
        continue;
      }

      const sanitizedName = sanitizeFilename(file.name);
      if (sanitizedName !== file.name) {
        validFiles.push(new File([file], sanitizedName, { type: file.type }));
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [onFilesSelected, maxSize, validateMagicBytes, showToast]);

  /**
   * Open the OS-native file dialog when running inside Tauri. The picked
   * paths are read into File objects so the rest of the pipeline (which
   * expects File[]) keeps working unchanged.
   */
  const handleNativePick = useCallback(async () => {
    if (!isTauri()) return;
    try {
      // Convert react-dropzone Accept to extension list (drop leading dot, lowercase).
      const extensions: string[] = [];
      if (accept) {
        for (const list of Object.values(accept)) {
          for (const mime of list) {
            const ext = mime.replace(/^\./, '').toLowerCase();
            if (!extensions.includes(ext)) extensions.push(ext);
          }
        }
      }
      const files = await pickFilesAsFiles({
        extensions: extensions.length ? extensions : ['pdf'],
        multiple: maxFiles !== 1,
        title,
      });
      if (files.length > 0) {
        // Reuse the same validation pipeline as drop.
        await onDrop(files);
      }
    } catch (err) {
      showToast({
        message: 'Native file picker failed: ' + (err instanceof Error ? err.message : String(err)),
        type: 'error',
        duration: 5000,
      });
    }
  }, [accept, maxFiles, onDrop, showToast, title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles > 0 ? maxFiles : undefined,
    maxSize
  });

  return (
    <div 
      {...getRootProps()}
      className={cn('dropzone-shell', isDragActive && 'drag-over')}
      style={{
        width: '100%',
        maxWidth: '680px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '3px',
        animation: 'fade-up 600ms 100ms cubic-bezier(0.32,0.72,0,1) both',
        transition: 'border-color var(--transition), box-shadow var(--transition)',
      }}
    >
      <input {...getInputProps()} aria-label={ariaLabel} />
      
      <div
        className={cn('dropzone-card', isDragActive && 'drag-over')}
        style={{
          background: isDragActive 
            ? 'linear-gradient(180deg, rgba(255,107,157,0.04) 0%, rgba(255,107,157,0.01) 100%)'
            : 'var(--surface)',
          borderRadius: 'calc(var(--radius-xl) - 3px)',
          padding: '52px 48px',
          position: 'relative',
          overflow: 'hidden',
          border: '2px dashed rgba(255,255,255,0.08)',
          cursor: 'pointer',
          transition: 'border-color var(--transition), background var(--transition)',
          borderColor: isDragActive ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            content: '',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        <div className="upload-icon" style={{
          width: '88px',
          height: '88px',
          margin: '0 auto 24px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="upload-icon-orb" style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(255,107,157,0.25) 0%, rgba(197,179,255,0.2) 100%)',
            filter: 'blur(12px)',
            animation: 'icon-float 4s ease-in-out infinite',
          }} />
          
          <div className="upload-icon-bg" style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(255,107,157,0.2) 0%, rgba(197,179,255,0.15) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px -8px rgba(255,107,157,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            transition: 'transform var(--transition), box-shadow var(--transition)',
          }}>
            <Upload 
              size={40} 
              style={{ 
                color: 'var(--accent)',
                filter: 'drop-shadow(0 0 8px rgba(255,107,157,0.5))',
              }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="drop-cta" style={{ textAlign: 'center' }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '22px',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            marginBottom: '6px',
            color: 'var(--text)',
          }}>
            {title}
          </h2>
          <p style={{
            color: 'var(--text-3)',
            fontSize: '14px',
            marginBottom: '28px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {subtitle}
          </p>

          <div className="btn-row" style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <button className="btn btn-primary" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '13px 22px',
              borderRadius: '100px',
              fontFamily: 'inherit',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              border: 'none',
              textDecoration: 'none',
              transition: 'transform 150ms, box-shadow 150ms, background var(--transition)',
              minHeight: '44px',
              background: 'var(--text)',
              color: 'var(--bg)',
            }}
            type="button"
            >
              Choose files
            </button>
            {isTauri() && (
              <button
                className="btn"
                type="button"
                onClick={(e) => { e.stopPropagation(); void handleNativePick(); }}
                aria-label="Browse files from disk (native)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px 22px',
                  borderRadius: '100px',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text)',
                  minHeight: '44px',
                  transition: 'all var(--transition)',
                }}
              >
                <FolderOpen size={18} aria-hidden="true" />
                Browse from disk…
              </button>
            )}
          </div>
        </div>

        <div className="trust" style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '28px',
          color: 'var(--text-3)',
          fontSize: '11px',
          fontFamily: "'DM Mono', monospace",
          flexWrap: 'wrap',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: 'var(--accent-2)',
              display: 'inline-block',
              marginRight: '5px',
            }} aria-hidden="true" />
            Maximum {MAX_FILE_SIZE_MB}MB per file
          </span>
        </div>
      </div>
    </div>
  );
}
