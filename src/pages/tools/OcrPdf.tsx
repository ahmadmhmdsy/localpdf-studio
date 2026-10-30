import { useEffect, useRef, useState } from 'react';
import { ScanText, AlertCircle, File as FileIcon, X } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import {
  ocrPdf,
  OCR_LANGUAGES,
  OcrCancelledError,
  OcrLanguageDataMissingError,
  type OcrLanguage,
  type OcrProgress,
  type OcrResult,
} from '../../lib/ocr';
import { InvalidPageRangeError } from '../../lib/pdf';
import { logError } from '../../lib/logger';
import { MAX_OCR_FILE_SIZE_MB, MAX_OCR_PAGES } from '../../constants/limits';
import { saveAs } from 'file-saver';
import { useI18n } from '../../i18n/useI18n';
import type { MessageKey } from '../../i18n';

type Step = 'upload' | 'configure' | 'loading' | 'processing' | 'done' | 'error';

const LANGUAGE_KEYS: Record<OcrLanguage, MessageKey> = {
  eng: 'tool.ocr.language.eng',
  ara: 'tool.ocr.language.ara',
};

const STATUS_KEYS: Record<OcrProgress['status'], MessageKey> = {
  rendering: 'tool.ocr.status.rendering',
  recognizing: 'tool.ocr.status.recognizing',
  embedding: 'tool.ocr.status.embedding',
  skipped: 'tool.ocr.status.skipped',
};

export default function OcrPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<OcrLanguage>('eng');
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageRange, setPageRange] = useState('');
  const [pageRangeError, setPageRangeError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { t, toolName, toolDescription } = useI18n();

  // Leaving the page stops a running OCR job and frees its worker.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      setFile(files[0]);
      setStep('configure');
    }
  };

  const handleOcr = async () => {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStep('loading');
    setError(null);
    setPageRangeError(null);
    setProgress(null);

    try {
      const ocrResult = await ocrPdf(file, {
        language,
        signal: controller.signal,
        pageRange,
        onProgress: (p) => {
          if (controller.signal.aborted) return;
          setStep('processing');
          setProgress(p);
        },
      });
      setResult(ocrResult);
      setStep('done');
    } catch (err) {
      if (err instanceof OcrCancelledError || controller.signal.aborted) {
        // handleCancel has already returned to the configure step.
        return;
      }
      if (err instanceof InvalidPageRangeError) {
        setPageRangeError(err.message);
        setStep('configure');
        return;
      }
      logError('Error running OCR:', err);
      setError(
        err instanceof OcrLanguageDataMissingError
          ? `${err.message} ${t('tool.ocr.languageDataHint')}`
          : err instanceof Error
            ? err.message
            : t('tool.ocr.error'),
      );
      setStep('error');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProgress(null);
    setStep('configure');
  };

  const handleDownload = () => {
    if (result && file) {
      const blob = new Blob([result.bytes as BlobPart], { type: 'application/pdf' });
      const newName = file.name.replace(/\.pdf$/i, '_searchable.pdf');
      saveAs(blob, newName);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setProgress(null);
    setResult(null);
    setError(null);
    setPageRange('');
    setPageRangeError(null);
  };

  const getProgressDescription = () => {
    if (!progress) return t('tool.ocr.engineLoading');
    const { page, totalPages, pageNumber, status } = progress;
    const statusText = t(STATUS_KEYS[status]);
    return page === pageNumber
      ? t('tool.ocr.progressPage', { status: statusText, page, total: totalPages })
      : t('tool.ocr.progressPageRange', {
          status: statusText,
          pageNumber,
          page,
          total: totalPages,
        });
  };

  const summary = () => {
    if (!result) return '';
    const parts = [
      t('tool.ocr.summaryWords', { words: result.wordsAdded, pages: result.pagesRecognized }),
    ];
    if (result.pagesSkipped > 0) {
      parts.push(t('tool.ocr.summarySkipped', { pages: result.pagesSkipped }));
    }
    if (result.charactersDropped > 0) {
      parts.push(t('tool.ocr.summaryDropped', { count: result.charactersDropped }));
    }
    return parts.join(' ');
  };

  return (
    <ToolLayout title={toolName('ocr-pdf')} description={toolDescription('ocr-pdf')}>
      {step === 'upload' && (
        <FileUploadZone
          ariaLabel={t('tool.common.selectPdfFile')}
          onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title={t('tool.ocr.uploadTitle')}
          subtitle={t('tool.repair.uploadSubtitle')}
        />
      )}

      {step === 'configure' && file && (
        <div className="w-full max-w-xl">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={20} className="text-blue-600" />
                </div>
                <span className="font-semibold text-[var(--text)]">{file.name}</span>
              </div>
              <button
                onClick={reset}
                className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label={t('tool.common.removeFile')}
              >
                <X size={20} />
              </button>
            </div>

            <label htmlFor="ocr-language" className="block text-[var(--text)] font-medium mb-2">
              {t('tool.ocr.languageLabel')}
            </label>
            <select
              id="ocr-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as OcrLanguage)}
              className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            >
              {OCR_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {t(LANGUAGE_KEYS[l.code])}
                </option>
              ))}
            </select>

            <label htmlFor="ocr-page-range" className="block text-[var(--text)] font-medium mt-5 mb-2">
              {t('tool.ocr.pagesLabel')}
            </label>
            <input
              id="ocr-page-range"
              type="text"
              value={pageRange}
              onChange={(e) => {
                setPageRange(e.target.value);
                setPageRangeError(null);
              }}
              placeholder={t('tool.ocr.pagesPlaceholder')}
              aria-invalid={pageRangeError ? true : undefined}
              aria-describedby={pageRangeError ? 'ocr-page-range-error' : undefined}
              className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            />
            {pageRangeError && (
              <p id="ocr-page-range-error" className="text-sm text-red-500 mt-2" role="alert">
                {pageRangeError}
              </p>
            )}
            <p className="text-sm text-[var(--text-3)] mt-3">{t('tool.ocr.pagesHelp')}</p>
            <p className="text-sm text-[var(--text-3)] mt-2">
              {t('tool.ocr.limits', { pages: MAX_OCR_PAGES, size: MAX_OCR_FILE_SIZE_MB })}
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleOcr}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              {t('tool.ocr.submit')}
            </button>
          </div>
        </div>
      )}

      {(step === 'loading' || step === 'processing') && (
        <div className="flex flex-col items-center py-12">
          <ProcessingState
            title={t('tool.ocr.processingTitle')}
            description={getProgressDescription()}
          />
          {progress && (
            <div
              className="mt-6 w-64 bg-[var(--surface-2)] rounded-full h-2"
              role="progressbar"
              aria-label={t('tool.ocr.progressLabel')}
              aria-valuemin={0}
              aria-valuemax={progress.totalPages}
              aria-valuenow={progress.page}
            >
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.page / progress.totalPages) * 100}%` }}
              />
            </div>
          )}
          <button
            onClick={handleCancel}
            className="mt-6 px-6 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] font-medium transition-colors"
          >
            {t('tool.common.cancel')}
          </button>
        </div>
      )}

      {step === 'done' && result && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <ScanText className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.ocr.doneTitle')}</h3>
            <p className="text-[var(--text-3)] mt-2">{summary()}</p>
            {result.wordsAdded === 0 && (
              <p className="text-amber-700 mt-2 text-sm">{t('tool.ocr.noText')}</p>
            )}
          </div>
          <button
            onClick={handleDownload}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            {t('tool.ocr.download')}
          </button>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('tool.ocr.again')}
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.ocr.failedTitle')}</h3>
            <p className="text-red-500 mt-2" role="alert">{error}</p>
            <p className="text-[var(--text-3)] mt-4 text-sm">{t('tool.ocr.memoryHint')}</p>
          </div>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('tool.common.tryAgain')}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
