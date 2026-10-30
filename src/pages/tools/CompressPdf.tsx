import { useEffect, useRef, useState } from 'react';
import { File as FileIcon, X, Settings, AlertTriangle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import {
  CompressionCancelledError,
  CompressionLimitError,
  compressPdf,
  type ImageCompression,
} from '../../lib/compress';
import { MAX_COMPRESS_FILE_SIZE_MB } from '../../constants/limits';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';
import { useManagedObjectUrl } from '../../hooks/useObjectUrl';
import { useI18n } from '../../i18n/useI18n';
import type { MessageKey } from '../../i18n';

type Step = 'upload' | 'configure' | 'processing' | 'download';

const PRESETS: { value: ImageCompression; nameKey: MessageKey; hintKey: MessageKey }[] = [
  { value: 'off', nameKey: 'tool.compress.preset.off.name', hintKey: 'tool.compress.preset.off.hint' },
  { value: 'light', nameKey: 'tool.compress.preset.light.name', hintKey: 'tool.compress.preset.light.hint' },
  {
    value: 'balanced',
    nameKey: 'tool.compress.preset.balanced.name',
    hintKey: 'tool.compress.preset.balanced.hint',
  },
  { value: 'strong', nameKey: 'tool.compress.preset.strong.name', hintKey: 'tool.compress.preset.strong.hint' },
];

export default function CompressPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<ImageCompression>('off');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const [originalSize, setOriginalSize] = useState<string>('');
  const [resultNotes, setResultNotes] = useState<string[]>([]);
  const [keptOriginal, setKeptOriginal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { showToast } = useToast();
  const { create: createObjectUrl, revoke: revokeObjectUrl } = useManagedObjectUrl();
  const { t, toolName, toolDescription, fileSize } = useI18n();

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleFilesSelected = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFile(newFiles[0]);
      setOriginalSize(fileSize(newFiles[0].size));
      setStep('configure');
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;

    setStep('processing');
    try {
      // The level only tunes save chunking; the preset decides the size.
      const result = await compressPdf(file, 'medium', { images: preset, signal: controller.signal });
      if (controller.signal.aborted) return;

      const blob = new Blob([result.bytes], { type: 'application/pdf' });
      const url = createObjectUrl(blob);

      setResultUrl(url);
      setResultSize(fileSize(blob.size));
      setResultNotes(result.notes);
      setKeptOriginal(result.keptOriginal);
      setStep('download');
    } catch (error) {
      if (error instanceof CompressionCancelledError || controller.signal.aborted) {
        // handleCancel has already returned to the configure step.
        return;
      }
      logError('Error compressing PDF:', error);
      showToast({
        message: error instanceof CompressionLimitError ? error.message : t('tool.common.error'),
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStep('configure');
  };

  const startOver = () => {
    setFile(null);
    if (resultUrl) {
      revokeObjectUrl();
      setResultUrl(null);
    }
    setResultNotes([]);
    setKeptOriginal(false);
    setStep('upload');
  };

  return (
    <ToolLayout title={toolName('compress-pdf')} description={toolDescription('compress-pdf')}>
      {step === 'upload' && (
        <FileUploadZone

          ariaLabel={t('tool.common.selectPdfFile')} onFilesSelected={handleFilesSelected}
          title={t('tool.common.selectPdfFile')}
          subtitle={t('tool.common.dropPdf')}
          maxFiles={1}
        />
      )}

      {step === 'configure' && file && (
        <div className="w-full max-w-3xl">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm shadow-inner shadow-[var(--border)]/40 p-6 mb-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={20} className="text-red-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[var(--text)]">{file.name}</span>
                  <span className="text-xs text-[var(--text-3)]">{originalSize}</span>
                </div>
              </div>
              <button
                onClick={startOver}
                className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label={t('tool.common.removeFile')}
              >
                <X size={20} />
              </button>
            </div>

            <div
              role="note"
              className="mb-6 flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm"
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>{t('tool.compress.losslessWarning')}</p>
            </div>

            <fieldset className="space-y-3">
              <legend className="flex items-center gap-2 text-[var(--text)] font-medium mb-3">
                <Settings size={20} className="text-red-600" aria-hidden="true" />
                {t('tool.compress.levelLegend')}
              </legend>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRESETS.map((option) => (
                  <label
                    key={option.value}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-red-500 ${
                      preset === option.value
                        ? 'border-red-600 bg-red-50'
                        : 'border-[var(--border)] hover:border-red-300 hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="compression-level"
                      value={option.value}
                      checked={preset === option.value}
                      onChange={() => setPreset(option.value)}
                      className="sr-only"
                    />
                    <div className="font-semibold text-[var(--text)]">{t(option.nameKey)}</div>
                    <div className="text-xs text-[var(--text-3)]">{t(option.hintKey)}</div>
                  </label>
                ))}
              </div>
              <p className="text-sm text-[var(--text-3)]">
                {t('tool.compress.presetsNote', { limit: MAX_COMPRESS_FILE_SIZE_MB })}
              </p>
            </fieldset>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleProcess}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              {t('tool.compress.submit')}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center py-12">
          <ProcessingState
            title={t('tool.compress.processingTitle')}
            description={t('tool.compress.processingDescription')}
          />
          <button
            onClick={handleCancel}
            className="mt-6 px-6 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] font-medium transition-colors"
          >
            {t('tool.common.cancel')}
          </button>
        </div>
      )}

      {step === 'download' && resultUrl && (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
          <DownloadState
            title={t('tool.compress.doneTitle')}
            description={
              keptOriginal
                ? t('tool.compress.doneKeptOriginal', { size: originalSize })
                : t('tool.compress.doneCompressed', { from: originalSize, to: resultSize })
            }
            fileName={`compressed_${file?.name || 'document.pdf'}`}
            fileUrl={resultUrl}
            fileSize={resultSize}
            onStartOver={startOver}
          />
          {resultNotes.length > 0 && (
            <div
              role="note"
              className="text-left p-4 rounded-xl bg-amber-50 border border-amber-200"
            >
              <p className="text-sm font-semibold text-amber-900 mb-1">{t('tool.compress.notes')}</p>
              <ul className="text-sm text-amber-900 list-disc pl-5 space-y-1">
                {resultNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}