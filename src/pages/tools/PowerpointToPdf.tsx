import React, { useState } from 'react';
import { Presentation, AlertCircle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { convertPowerpointToPdf } from '../../lib/office-pptx';
import { saveAs } from 'file-saver';
import { useI18n } from '../../i18n/useI18n';

type Step = 'upload' | 'processing' | 'done' | 'error';

export default function PowerpointToPdf() {
  const { t, toolName, toolDescription } = useI18n();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      const selectedFile = files[0];
      if (!selectedFile.name.match(/\.(pptx|ppt)$/i)) {
        setError(t('tool.powerpoint.invalidFile'));
        setStep('error');
        return;
      }
      setFile(selectedFile);
      handleConvert(selectedFile);
    }
  };

  const handleConvert = async (selectedFile: File) => {
    setStep('processing');
    setError(null);

    try {
      const result = await convertPowerpointToPdf(selectedFile);
      setResultData(result);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tool.powerpoint.error'));
      setStep('error');
    }
  };

  const handleDownload = () => {
    if (resultData && file) {
      const blob = new Blob([resultData], { type: 'application/pdf' });
      const newName = file.name.replace(/\.(pptx|ppt)$/i, '.pdf');
      saveAs(blob, newName);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setResultData(null);
    setError(null);
  };

  return (
    <ToolLayout title={toolName('powerpoint-to-pdf')} description={toolDescription('powerpoint-to-pdf')}>
      {step === 'upload' && (
        <FileUploadZone
          
          ariaLabel={t('tool.powerpoint.uploadAria')} onFilesSelected={handleFilesSelected}
          accept={{
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'application/vnd.ms-powerpoint': ['.ppt'],
          }}
          maxFiles={1}
          title={t('tool.powerpoint.uploadTitle')}
          subtitle={t('tool.powerpoint.uploadSubtitle')}
        />
      )}

      {step === 'processing' && (
        <ProcessingState
          title={t('tool.powerpoint.processingTitle')}
          description={t('tool.powerpoint.processingDescription')}
        />
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <Presentation className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.common.conversionSuccess')}</h3>
            <p className="text-[var(--text-3)] mt-2">{t('tool.powerpoint.successDescription')}</p>
            <p className="text-sm text-[var(--text-3)] mt-1">{t('tool.powerpoint.successHint')}</p>
          </div>
          <button
            onClick={handleDownload}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            {t('tool.common.downloadPdf')}
          </button>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('tool.powerpoint.again')}
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
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
