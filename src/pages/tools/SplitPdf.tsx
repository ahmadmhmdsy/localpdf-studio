import { useState } from 'react';
import { File as FileIcon, X } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { getSplitArchiveFileName, splitPdfToFiles, type SplitMode } from '../../lib/pdf';
import { buildZipFile } from '../../lib/zip';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';
import { useManagedObjectUrl } from '../../hooks/useObjectUrl';

type Step = 'upload' | 'configure' | 'processing' | 'download';

/** One radio option per way a document can be divided. */
interface SplitModeOption {
  id: SplitMode;
  name: string;
  description: string;
}

const SPLIT_MODE_OPTIONS: SplitModeOption[] = [
  {
    id: 'ranges',
    name: 'By page range',
    description: 'One PDF per comma-separated range, e.g. 1-3, 4, 5-8.',
  },
  {
    id: 'every-n',
    name: 'Every N pages',
    description: 'Equal chunks of N pages, for example 1-2, 3-4, 5.',
  },
  {
    id: 'each-page',
    name: 'One file per page',
    description: 'Every page becomes its own PDF.',
  },
];

/** Chunk size pre-filled for the "Every N pages" mode. */
const DEFAULT_PAGES_PER_FILE = 10;

const BYTES_PER_MB = 1024 * 1024;

interface SplitResult {
  url: string;
  size: string;
  fileName: string;
  fileCount: number;
  isArchive: boolean;
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
}

export default function SplitPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<SplitMode>('ranges');
  const [ranges, setRanges] = useState<string>('');
  const [pagesPerFile, setPagesPerFile] = useState<string>(String(DEFAULT_PAGES_PER_FILE));
  const [result, setResult] = useState<SplitResult | null>(null);
  const { showToast } = useToast();
  const { create: createObjectUrl, revoke: revokeObjectUrl } = useManagedObjectUrl();

  const chunkSize = Number(pagesPerFile);
  const chunkSizeIsValid = Number.isInteger(chunkSize) && chunkSize >= 1;
  const canSubmit =
    mode === 'each-page' || (mode === 'ranges' ? ranges.trim().length > 0 : chunkSizeIsValid);

  const handleFilesSelected = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFile(newFiles[0]);
      setStep('configure');
    }
  };

  const handleSplit = async () => {
    if (!file) {
      showToast({ message: 'Please select a PDF file first.', type: 'warning' });
      return;
    }
    if (mode === 'ranges' && !ranges.trim()) {
      showToast({ message: 'Please enter the page ranges to split.', type: 'warning' });
      return;
    }
    if (mode === 'every-n' && !chunkSizeIsValid) {
      showToast({ message: 'Pages per file must be a whole number of at least 1.', type: 'warning' });
      return;
    }

    setStep('processing');
    try {
      const files = await splitPdfToFiles(
        file,
        mode,
        mode === 'ranges'
          ? { rangeString: ranges }
          : mode === 'every-n'
            ? { pagesPerFile: chunkSize }
            : {},
      );

      if (files.length === 0) {
        throw new Error('The split produced no files. Please check your page ranges and try again.');
      }

      const isArchive = files.length > 1;
      const blob = isArchive
        ? await buildZipFile(files.map(({ fileName, data }) => ({ name: fileName, data })))
        : new Blob([files[0].data], { type: 'application/pdf' });
      const fileName = isArchive ? getSplitArchiveFileName(file.name) : files[0].fileName;

      const url = createObjectUrl(blob);
      setResult({
        url,
        size: formatMegabytes(blob.size),
        fileName,
        fileCount: files.length,
        isArchive,
      });
      setStep('download');
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      logError('Error splitting PDF:', normalizedError);
      showToast({
        message: normalizedError.message || 'An error occurred while splitting the PDF. Please check your page ranges and try again.',
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    }
  };

  const startOver = () => {
    setFile(null);
    setRanges('');
    setPagesPerFile(String(DEFAULT_PAGES_PER_FILE));
    if (result) {
      revokeObjectUrl();
      setResult(null);
    }
    setStep('upload');
  };

  return (
    <ToolLayout
      title="Split PDF"
      description="Split a PDF into separate files by page range, every N pages, or one page per file."
    >
      {step === 'upload' && (
        <FileUploadZone

          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected}
          title="Select PDF file"
          subtitle="or drop PDF here"
          maxFiles={1}
        />
      )}

      {step === 'configure' && file && (
        <div className="w-full max-w-4xl">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm shadow-inner shadow-[var(--border)]/40 p-8 mb-8">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={24} className="text-red-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[var(--text)] text-lg">{file.name}</span>
                  <span className="text-sm text-[var(--text-3)]">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
              <button
                onClick={startOver}
                className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Remove file"
              >
                <X size={24} />
              </button>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-[var(--text-2)] mb-3">
                How should the PDF be split?
              </legend>
              <div className="space-y-3">
                {SPLIT_MODE_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      mode === option.id
                        ? 'border-red-500 bg-red-50'
                        : 'border-[var(--border)] hover:border-red-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="split-mode"
                      value={option.id}
                      checked={mode === option.id}
                      onChange={() => setMode(option.id)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        mode === option.id ? 'border-red-500 bg-red-500' : 'border-[var(--border)]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="flex flex-col">
                      <span className="font-semibold text-[var(--text)]">{option.name}</span>
                      <span className="text-sm text-[var(--text-3)]">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {mode === 'ranges' && (
              <div className="space-y-4 mt-6">
                <label htmlFor="ranges" className="block text-sm font-medium text-[var(--text-2)]">
                  Page ranges
                </label>
                <input
                  type="text"
                  id="ranges"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  placeholder="e.g., 1-3, 4, 5-8"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                />
                <p className="text-sm text-[var(--text-3)]">
                  Enter page numbers and/or page ranges separated by commas. Each range becomes its own PDF file.
                </p>
              </div>
            )}

            {mode === 'every-n' && (
              <div className="space-y-4 mt-6">
                <label htmlFor="pages-per-file" className="block text-sm font-medium text-[var(--text-2)]">
                  Pages per file
                </label>
                <input
                  type="number"
                  id="pages-per-file"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={pagesPerFile}
                  onChange={(e) => setPagesPerFile(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                />
                <p className="text-sm text-[var(--text-3)]">
                  Every N pages becomes its own PDF file. The last file keeps any remaining pages.
                </p>
              </div>
            )}

            {mode === 'each-page' && (
              <p className="text-sm text-[var(--text-3)] mt-6">
                Every page becomes its own PDF. Documents with more than one page are bundled into a ZIP archive.
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSplit}
              disabled={!canSubmit}
              className="bg-red-600 hover:bg-red-700 disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              Split PDF
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Splitting PDF..."
          description="Please wait while we create the split files. This is happening locally in your browser."
        />
      )}

      {step === 'download' && result && (
        <DownloadState
          title="PDF split successfully!"
          description={
            result.isArchive
              ? `Your PDF was split into ${result.fileCount} files, packaged as a ZIP archive.`
              : 'Your extracted pages have been saved into a new PDF file.'
          }
          fileName={result.fileName}
          fileUrl={result.url}
          fileSize={result.size}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}
