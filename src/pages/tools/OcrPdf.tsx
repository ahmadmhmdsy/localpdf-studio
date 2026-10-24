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

type Step = 'upload' | 'configure' | 'loading' | 'processing' | 'done' | 'error';

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
          ? `${err.message} Ask the person who deployed this app to add the language file.`
          : err instanceof Error
            ? err.message
            : 'Failed to OCR PDF',
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
    if (!progress) return 'Loading the OCR engine...';
    const { page, totalPages, pageNumber, status } = progress;
    const statusText = {
      rendering: 'Rendering page...',
      recognizing: 'Recognizing text...',
      embedding: 'Adding searchable text...',
      skipped: 'Page already has text, skipping...',
    }[status];
    return page === pageNumber
      ? `${statusText} (Page ${page} of ${totalPages})`
      : `${statusText} (Page ${pageNumber}; ${page} of ${totalPages})`;
  };

  const summary = () => {
    if (!result) return '';
    const parts = [`${result.wordsAdded} words added on ${result.pagesRecognized} page(s).`];
    if (result.pagesSkipped > 0) {
      parts.push(`${result.pagesSkipped} page(s) already had text and were left as they are.`);
    }
    if (result.charactersDropped > 0) {
      parts.push(`${result.charactersDropped} character(s) could not be stored in the text layer and were left out.`);
    }
    return parts.join(' ');
  };

  return (
    <ToolLayout
      title="OCR PDF"
      description="Make scanned PDFs searchable. Text recognition runs on your device; your file is not uploaded."
    >
      {step === 'upload' && (
        <FileUploadZone
          ariaLabel="Select PDF file"
          onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title="Select a scanned PDF"
          subtitle="or drop PDF file here"
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
                aria-label="Remove file"
              >
                <X size={20} />
              </button>
            </div>

            <label htmlFor="ocr-language" className="block text-[var(--text)] font-medium mb-2">
              Document language
            </label>
            <select
              id="ocr-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as OcrLanguage)}
              className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            >
              {OCR_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>

            <label htmlFor="ocr-page-range" className="block text-[var(--text)] font-medium mt-5 mb-2">
              Pages (optional)
            </label>
            <input
              id="ocr-page-range"
              type="text"
              value={pageRange}
              onChange={(e) => {
                setPageRange(e.target.value);
                setPageRangeError(null);
              }}
              placeholder="All pages, or e.g. 1-3, 7"
              aria-invalid={pageRangeError ? true : undefined}
              aria-describedby={pageRangeError ? 'ocr-page-range-error' : undefined}
              className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            />
            {pageRangeError && (
              <p id="ocr-page-range-error" className="text-sm text-red-500 mt-2" role="alert">
                {pageRangeError}
              </p>
            )}
            <p className="text-sm text-[var(--text-3)] mt-3">
              Pages that already contain text are skipped. The scanned image is kept as it is; an
              invisible text layer is added on top so you can search, select and copy.
            </p>
            <p className="text-sm text-[var(--text-3)] mt-2">
              Limits: up to {MAX_OCR_PAGES} pages and {MAX_OCR_FILE_SIZE_MB} MB per file. For a longer
              document, choose a page range.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleOcr}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              Recognize text
            </button>
          </div>
        </div>
      )}

      {(step === 'loading' || step === 'processing') && (
        <div className="flex flex-col items-center py-12">
          <ProcessingState
            title="Processing with OCR..."
            description={getProgressDescription()}
          />
          {progress && (
            <div
              className="mt-6 w-64 bg-[var(--surface-2)] rounded-full h-2"
              role="progressbar"
              aria-label="OCR progress"
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
            Cancel
          </button>
        </div>
      )}

      {step === 'done' && result && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <ScanText className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">OCR Complete!</h3>
            <p className="text-[var(--text-3)] mt-2">{summary()}</p>
            {result.wordsAdded === 0 && (
              <p className="text-amber-700 mt-2 text-sm">
                No text was recognized. Check the document language, or try a sharper scan.
              </p>
            )}
          </div>
          <button
            onClick={handleDownload}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Download Searchable PDF
          </button>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            OCR Another PDF
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">OCR Failed</h3>
            <p className="text-red-500 mt-2" role="alert">{error}</p>
            <p className="text-[var(--text-3)] mt-4 text-sm">
              Note: Large PDFs may cause memory issues. Try splitting the PDF first.
            </p>
          </div>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Try Again
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
