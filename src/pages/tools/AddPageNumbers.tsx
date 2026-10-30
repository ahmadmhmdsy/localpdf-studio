import { useState } from 'react';
import { File as FileIcon, X } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import {
  addPageNumbers,
  DEFAULT_PAGE_NUMBER_POSITION,
  PAGE_NUMBER_POSITIONS,
  type PageNumberPosition,
} from '../../lib/pdf';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';
import { useManagedObjectUrl } from '../../hooks/useObjectUrl';
import { useI18n } from '../../i18n/useI18n';
import type { MessageKey } from '../../i18n';

type Step = 'upload' | 'configure' | 'processing' | 'download';

const POSITION_LABEL_KEYS: Record<PageNumberPosition, MessageKey> = {
  'top-left': 'tool.pageNumbers.position.topLeft',
  'top-center': 'tool.pageNumbers.position.topCenter',
  'top-right': 'tool.pageNumbers.position.topRight',
  'middle-left': 'tool.pageNumbers.position.middleLeft',
  'middle-center': 'tool.pageNumbers.position.middleCenter',
  'middle-right': 'tool.pageNumbers.position.middleRight',
  'bottom-left': 'tool.pageNumbers.position.bottomLeft',
  'bottom-center': 'tool.pageNumbers.position.bottomCenter',
  'bottom-right': 'tool.pageNumbers.position.bottomRight',
};

export default function AddPageNumbers() {
  const { t, toolName, toolDescription, fileSize } = useI18n();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<PageNumberPosition>(DEFAULT_PAGE_NUMBER_POSITION);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const { showToast } = useToast();
  const { create: createObjectUrl, revoke: revokeObjectUrl } = useManagedObjectUrl();

  const handleFilesSelected = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFile(newFiles[0]);
      setStep('configure');
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setStep('processing');
    try {
      const pdfBytes = await addPageNumbers(file, position);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = createObjectUrl(blob);
      
      setResultUrl(url);
      setResultSize(fileSize(blob.size));
      setStep('download');
    } catch (error) {
      logError('Error adding page numbers:', error);
      showToast({
        message: t('tool.common.error'),
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    }
  };

  const startOver = () => {
    setFile(null);
    setPosition(DEFAULT_PAGE_NUMBER_POSITION);
    revokeObjectUrl();
    setResultUrl(null);
    setStep('upload');
  };

  return (
    <ToolLayout title={toolName('add-page-numbers')} description={toolDescription('add-page-numbers')}>
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
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={24} className="text-purple-600" />
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
              <label className="block text-sm font-medium text-[var(--text-2)]">
                {t('tool.pageNumbers.position')}
              </label>
              <div className="grid grid-cols-3 gap-4 max-w-md">
                {PAGE_NUMBER_POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPosition(pos)}
                    className={`p-4 rounded-xl border font-medium transition-colors flex items-center justify-center text-sm ${position === pos ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]'}`}
                  >
                    {t(POSITION_LABEL_KEYS[pos])}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleProcess}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              {t('tool.pageNumbers.submit')}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title={t('tool.pageNumbers.processingTitle')}
          description={t('tool.pageNumbers.processingDescription')}
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title={t('tool.pageNumbers.successTitle')}
          description={t('tool.pageNumbers.successDescription')}
          fileName={`numbered_${file?.name || 'document.pdf'}`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}