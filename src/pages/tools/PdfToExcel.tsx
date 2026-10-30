import React, { useState } from 'react';
import { FileSpreadsheet, AlertCircle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { convertPdfToExcel } from '../../lib/pdf-to-excel';
import { useI18n } from '../../i18n/useI18n';

type Step = 'upload' | 'processing' | 'done' | 'error';

export default function PdfToExcel() {
  const { t, toolName, toolDescription } = useI18n();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      setFile(files[0]);
      handleConvert(files[0]);
    }
  };

  const handleConvert = async (selectedFile: File) => {
    setStep('processing');
    setError(null);

    try {
      const blob = await convertPdfToExcel(selectedFile);
      setResultBlob(blob);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tool.pdfExcel.error'));
      setStep('error');
    }
  };

  const handleDownload = () => {
    if (resultBlob && file) {
      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, '.xlsx');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setResultBlob(null);
    setError(null);
  };

  return (
    <ToolLayout title={toolName('pdf-to-excel')} description={toolDescription('pdf-to-excel')}>
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
          title={t('tool.pdfExcel.processingTitle')}
          description={t('tool.pdfExcel.processingDescription')}
        />
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.pdfExcel.successTitle')}</h3>
            <p className="text-[var(--text-3)] mt-2">{t('tool.pdfExcel.successDescription')}</p>
            <p className="text-sm text-[var(--text-3)] mt-1">{t('tool.pdfExcel.successHint')}</p>
          </div>
          <button
            onClick={handleDownload}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            {t('tool.pdfExcel.download')}
          </button>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('tool.pdfExcel.again')}
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.pdfExcel.failedTitle')}</h3>
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
