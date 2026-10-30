import { useState } from 'react';
import { File as FileIcon, X } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { pdfToJpgs } from '../../lib/image';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../i18n/useI18n';

type Step = 'upload' | 'configure' | 'processing' | 'download';

export default function PdfToJpg() {
  const { t, toolName, toolDescription, fileSize } = useI18n();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const { showToast } = useToast();

  const handleFilesSelected = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFile(newFiles[0]);
      setStep('configure');
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setStep('processing');
    try {
      const zipBlob = await pdfToJpgs(file);
      const url = URL.createObjectURL(zipBlob);
      
      setResultUrl(url);
      setResultSize(fileSize(zipBlob.size));
      setStep('download');
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      logError('Error converting PDF to JPG:', normalizedError);
      showToast({
        message: normalizedError.message || t('tool.pdfJpg.error'),
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    }
  };

  const startOver = () => {
    setFile(null);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('upload');
  };

  return (
    <ToolLayout title={toolName('pdf-to-jpg')} description={toolDescription('pdf-to-jpg')}>
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
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={24} className="text-yellow-600" />
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
            <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
              <p className="text-sm text-yellow-800">
                {t('tool.pdfJpg.hint')}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleConvert}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              {t('tool.pdfJpg.convert')}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title={t('tool.pdfJpg.processingTitle')}
          description={t('tool.pdfJpg.processingDescription')}
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title={t('tool.pdfJpg.successTitle')}
          description={t('tool.pdfJpg.successDescription')}
          fileName={`${file?.name.replace('.pdf', '') || 'images'}_jpgs.zip`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}