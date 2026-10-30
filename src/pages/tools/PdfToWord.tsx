import React, { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { convertPdfToWord } from '../../lib/pdf-to-word';
import { useI18n } from '../../i18n/useI18n';

type Step = 'upload' | 'processing' | 'done' | 'error';

export default function PdfToWord() {
  const { t, toolName, toolDescription } = useI18n();
  const [step, setStep] = useState<Step>('upload');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      handleConvert(files[0]);
    }
  };

  const handleConvert = async (selectedFile: File) => {
    setStep('processing');
    setError(null);

    try {
      const blob = await convertPdfToWord(selectedFile);
      const newName = selectedFile.name.replace(/\.pdf$/i, '.docx');
      setDownloadName(newName);
      setDownloadUrl(URL.createObjectURL(blob));
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tool.pdfWord.error'));
      setStep('error');
    }
  };

  const reset = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setStep('upload');
    setDownloadUrl(null);
    setDownloadName('');
    setError(null);
  };

  return (
    <ToolLayout title={toolName('pdf-to-word')} description={toolDescription('pdf-to-word')}>
      {step === 'upload' && (
        <FileUploadZone

          ariaLabel={t('tool.common.selectPdfFile')} onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title={t('tool.common.selectAPdfFile')}
          subtitle={t('tool.common.dropPdf')}
        />
      )}

      {step === 'processing' && (
        <ProcessingState
          title={t('tool.pdfWord.processingTitle')}
          description={t('tool.pdfWord.processingDescription')}
        />
      )}

      {step === 'done' && downloadUrl && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-green-600" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.common.conversionSuccess')}</h3>
            <p className="text-[var(--text-3)] mt-2">{t('tool.pdfWord.successDescription')}</p>
          </div>
          <a
            href={downloadUrl}
            download={downloadName}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors no-underline"
          >
            {t('tool.pdfWord.download', { name: downloadName })}
          </a>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('tool.common.startOver')}
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" aria-hidden="true" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.common.conversionFailed')}</h3>
            <p className="text-red-500 mt-2">{error}</p>
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
