import React, { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { convertWordToPdf } from '../../lib/office-word';

type Step = 'upload' | 'processing' | 'done' | 'error';

export default function WordToPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      const selectedFile = files[0];
      if (!selectedFile.name.match(/\.(docx|doc)$/i)) {
        setError('Please select a Word document (.docx or .doc)');
        setStep('error');
        return;
      }
      handleConvert(selectedFile);
    }
  };

  const handleConvert = async (selectedFile: File) => {
    setStep('processing');
    setError(null);

    try {
      const data = await convertWordToPdf(selectedFile);
      const blob = new Blob([data], { type: 'application/pdf' });
      const newName = selectedFile.name.replace(/\.(docx|doc)$/i, '.pdf');
      setDownloadName(newName);
      setDownloadUrl(URL.createObjectURL(blob));
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert Word to PDF');
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
    <ToolLayout
      title="WORD to PDF"
      description="Convert DOCX documents to PDF with approximate layout."
    >
      {step === 'upload' && (
        <FileUploadZone
          onFilesSelected={handleFilesSelected}
          accept={{
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc'],
          }}
          maxFiles={1}
          title="Select a Word document"
          subtitle="or drop DOCX/DOC file here"
          ariaLabel="Select Word file"
        />
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Converting to PDF..."
          description="Extracting content and creating PDF. This may take a moment."
        />
      )}

      {step === 'done' && downloadUrl && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-green-600" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-[var(--text)]">Conversion Successful!</h3>
            <p className="text-[var(--text-3)] mt-2">Your Word document has been converted to PDF.</p>
          </div>
          <a
            href={downloadUrl}
            download={downloadName}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors no-underline"
          >
            Download {downloadName}
          </a>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Start over
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" aria-hidden="true" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">Conversion Failed</h3>
            <p className="text-red-500 mt-2">{error}</p>
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
