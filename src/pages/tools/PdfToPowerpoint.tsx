import React, { useState } from 'react';
import { Presentation, FileCheck, AlertCircle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { convertPdfToPowerpoint } from '../../lib/pdf-to-pptx';

type Step = 'upload' | 'processing' | 'done' | 'error';

export default function PdfToPowerpoint() {
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
      const blob = await convertPdfToPowerpoint(selectedFile);
      setResultBlob(blob);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF to PowerPoint');
      setStep('error');
    }
  };

  const handleDownload = () => {
    if (resultBlob && file) {
      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, '.pptx');
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
    <ToolLayout
      title="PDF to POWERPOINT"
      description="Convert PDF pages to PowerPoint slides as images."
    >
      {step === 'upload' && (
        <FileUploadZone
          
          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title="Select a PDF file"
          subtitle="or drop PDF here"
        />
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Creating presentation..."
          description="Converting PDF pages to PowerPoint slides."
        />
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <Presentation className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900">Conversion Successful!</h3>
            <p className="text-gray-500 mt-2">Your PDF has been converted to PowerPoint.</p>
            <p className="text-sm text-gray-500 mt-1">Each PDF page is now a slide with the page as an image.</p>
          </div>
          <button
            onClick={handleDownload}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Download PPTX
          </button>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Convert Another PDF
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
