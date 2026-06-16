import React, { useState } from 'react';
import { FileText, FileCheck, AlertCircle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { convertWordToPdf } from '../../lib/office-word';
import { saveAs } from 'file-saver';

type Step = 'upload' | 'processing' | 'done' | 'error';

export default function WordToPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      const selectedFile = files[0];
      if (!selectedFile.name.match(/\.(docx|doc)$/i)) {
        setError('Please select a Word document (.docx or .doc)');
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
      const result = await convertWordToPdf(selectedFile);
      setResultData(result);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert Word to PDF');
      setStep('error');
    }
  };

  const handleDownload = () => {
    if (resultData && file) {
      const blob = new Blob([resultData], { type: 'application/pdf' });
      const newName = file.name.replace(/\.(docx|doc)$/i, '.pdf');
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
    <ToolLayout
      title="WORD to PDF"
      description="Convert Word documents to PDF format quickly and easily."
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

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900">Conversion Successful!</h3>
            <p className="text-gray-500 mt-2">Your Word document has been converted to PDF.</p>
          </div>
          <button
            onClick={handleDownload}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Download PDF
          </button>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Convert Another Document
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-gray-900">Conversion Failed</h3>
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
