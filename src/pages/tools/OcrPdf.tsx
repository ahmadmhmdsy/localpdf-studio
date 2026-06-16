import React, { useState } from 'react';
import { ScanText, FileCheck, AlertCircle, Loader2 } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { ocrPdf, OcrProgress } from '../../lib/ocr';
import { saveAs } from 'file-saver';

type Step = 'upload' | 'loading' | 'processing' | 'done' | 'error';

export default function OcrPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      setFile(files[0]);
      handleOcr(files[0]);
    }
  };

  const handleOcr = async (selectedFile: File) => {
    setStep('loading');
    setError(null);

    try {
      const result = await ocrPdf(selectedFile, (p) => {
        setStep('processing');
        setProgress(p);
      });
      setResultData(result);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to OCR PDF');
      setStep('error');
    }
  };

  const handleDownload = () => {
    if (resultData && file) {
      const blob = new Blob([resultData], { type: 'application/pdf' });
      const newName = file.name.replace(/\.pdf$/i, '_searchable.pdf');
      saveAs(blob, newName);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setProgress(null);
    setResultData(null);
    setError(null);
  };

  const getProgressDescription = () => {
    if (!progress) return 'Loading OCR engine...';
    const { page, totalPages, status } = progress;
    const statusText = {
      rendering: 'Rendering page for OCR...',
      recognizing: 'Recognizing text with AI...',
      embedding: 'Embedding searchable text...',
    }[status];
    return `${statusText} (Page ${page} of ${totalPages})`;
  };

  return (
    <ToolLayout
      title="OCR PDF"
      description="Make scanned PDFs searchable by recognizing text with AI-powered OCR."
    >
      {step === 'upload' && (
        <FileUploadZone
          
          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title="Select a scanned PDF"
          subtitle="or drop PDF file here"
        />
      )}

      {(step === 'loading' || step === 'processing') && (
        <div className="flex flex-col items-center py-12">
          <ProcessingState
            title="Processing with OCR..."
            description={getProgressDescription()}
          />
          {progress && (
            <div className="mt-6 w-64 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.page / progress.totalPages) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <ScanText className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900">OCR Complete!</h3>
            <p className="text-gray-500 mt-2">
              Your PDF is now searchable. Text can be selected and copied.
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Download Searchable PDF
          </button>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            OCR Another PDF
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-gray-900">OCR Failed</h3>
            <p className="text-red-500 mt-2">{error}</p>
            <p className="text-gray-500 mt-4 text-sm">
              Note: Large PDFs may cause memory issues. Try splitting the PDF first.
            </p>
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
