import { useState } from 'react';
import { File as FileIcon, X } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { extractPages } from '../../lib/pdf';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../i18n/useI18n';

type Step = 'upload' | 'configure' | 'processing' | 'download';

export default function ExtractPages() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [ranges, setRanges] = useState<string>('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const { showToast } = useToast();
  const { t, toolName, toolDescription, fileSize } = useI18n();

  const handleFilesSelected = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFile(newFiles[0]);
      setStep('configure');
    }
  };

  const handleProcess = async () => {
    if (!file || !ranges.trim()) {
      showToast({ message: t('tool.extract.warning'), type: 'warning' });
      return;
    }

    setStep('processing');
    try {
      const extractedPdfBytes = await extractPages(file, ranges);
      
      const blob = new Blob([extractedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultSize(fileSize(blob.size));
      setStep('download');
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      logError('Error extracting pages:', normalizedError);
      showToast({
        message: normalizedError.message || t('tool.extract.error'),
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    }
  };

  const startOver = () => {
    setFile(null);
    setRanges('');
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('upload');
  };

  return (
    <ToolLayout 
      title={toolName('extract-pages')} 
      description={toolDescription('extract-pages')}
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

            <div className="space-y-4">
              <label htmlFor="ranges" className="block text-sm font-medium text-[var(--text-2)]">
                {t('tool.extract.pagesLabel')}
              </label>
              <input
                type="text"
                id="ranges"
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder={t('tool.extract.placeholder')}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              />
              <p className="text-sm text-[var(--text-3)]">
                {t('tool.extract.help')}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleProcess}
              disabled={!ranges.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              {t('tool.extract.submit')}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title={t('tool.extract.processingTitle')} 
          description={t('tool.extract.processingDescription')}
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title={t('tool.extract.successTitle')}
          description={t('tool.extract.successDescription')}
          fileName={`extracted_${file?.name || 'document.pdf'}`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}