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
import { useI18n } from '../../i18n/useI18n';
import type { MessageKey } from '../../i18n';

type Step = 'upload' | 'configure' | 'processing' | 'download';

/** One radio option per way a document can be divided. */
interface SplitModeOption {
  id: SplitMode;
  nameKey: MessageKey;
  descriptionKey: MessageKey;
}

const SPLIT_MODE_OPTIONS: SplitModeOption[] = [
  {
    id: 'ranges',
    nameKey: 'tool.split.mode.ranges.name',
    descriptionKey: 'tool.split.mode.ranges.description',
  },
  {
    id: 'every-n',
    nameKey: 'tool.split.mode.everyN.name',
    descriptionKey: 'tool.split.mode.everyN.description',
  },
  {
    id: 'each-page',
    nameKey: 'tool.split.mode.eachPage.name',
    descriptionKey: 'tool.split.mode.eachPage.description',
  },
];

/** Chunk size pre-filled for the "Every N pages" mode. */
const DEFAULT_PAGES_PER_FILE = 10;

interface SplitResult {
  url: string;
  size: string;
  fileName: string;
  fileCount: number;
  isArchive: boolean;
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
  const { t, toolName, toolDescription, fileSize } = useI18n();

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
      showToast({ message: t('tool.split.needFile'), type: 'warning' });
      return;
    }
    if (mode === 'ranges' && !ranges.trim()) {
      showToast({ message: t('tool.split.needRanges'), type: 'warning' });
      return;
    }
    if (mode === 'every-n' && !chunkSizeIsValid) {
      showToast({ message: t('tool.split.needChunk'), type: 'warning' });
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
        throw new Error(t('tool.split.noFiles'));
      }

      const isArchive = files.length > 1;
      const blob = isArchive
        ? await buildZipFile(files.map(({ fileName, data }) => ({ name: fileName, data })))
        : new Blob([files[0].data], { type: 'application/pdf' });
      const fileName = isArchive ? getSplitArchiveFileName(file.name) : files[0].fileName;

      const url = createObjectUrl(blob);
      setResult({
        url,
        size: fileSize(blob.size),
        fileName,
        fileCount: files.length,
        isArchive,
      });
      setStep('download');
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      logError('Error splitting PDF:', normalizedError);
      showToast({
        message: normalizedError.message || t('tool.split.error'),
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
      title={toolName('split-pdf')}
      description={toolDescription('split-pdf')}
    >
      {step === 'upload' && (
        <FileUploadZone

          ariaLabel={t('tool.common.selectPdfFile')} onFilesSelected={handleFilesSelected}
          title={t('tool.common.selectPdfFile')}
          subtitle={t('tool.common.dropPdf')}
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
                  <span className="text-sm text-[var(--text-3)]">{fileSize(file.size)}</span>
                </div>
              </div>
              <button
                onClick={startOver}
                className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label={t('tool.common.removeFile')}
              >
                <X size={24} />
              </button>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-[var(--text-2)] mb-3">
                {t('tool.split.question')}
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
                      <span className="font-semibold text-[var(--text)]">{t(option.nameKey)}</span>
                      <span className="text-sm text-[var(--text-3)]">{t(option.descriptionKey)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {mode === 'ranges' && (
              <div className="space-y-4 mt-6">
                <label htmlFor="ranges" className="block text-sm font-medium text-[var(--text-2)]">
                  {t('tool.split.rangesLabel')}
                </label>
                <input
                  type="text"
                  id="ranges"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  placeholder={t('tool.split.rangesPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                />
                <p className="text-sm text-[var(--text-3)]">
                  {t('tool.split.rangesHelp')}
                </p>
              </div>
            )}

            {mode === 'every-n' && (
              <div className="space-y-4 mt-6">
                <label htmlFor="pages-per-file" className="block text-sm font-medium text-[var(--text-2)]">
                  {t('tool.split.pagesPerFileLabel')}
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
                  {t('tool.split.pagesPerFileHelp')}
                </p>
              </div>
            )}

            {mode === 'each-page' && (
              <p className="text-sm text-[var(--text-3)] mt-6">
                {t('tool.split.eachPageHelp')}
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSplit}
              disabled={!canSubmit}
              className="bg-red-600 hover:bg-red-700 disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              {t('tool.split.submit')}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState
          title={t('tool.split.processingTitle')}
          description={t('tool.split.processingDescription')}
        />
      )}

      {step === 'download' && result && (
        <DownloadState
          title={t('tool.split.successTitle')}
          description={
            result.isArchive
              ? t('tool.split.successArchive', { count: result.fileCount })
              : t('tool.split.successSingle')
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
