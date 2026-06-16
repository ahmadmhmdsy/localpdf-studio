import React, { useState } from 'react';
import { FileSpreadsheet, FileCheck, AlertCircle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { convertPdfToExcel } from '../../lib/pdf-to-excel';

type Step = 'upload' | 'processing' | 'done' | 'error';

export default function PdfToExcel() {
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
      setError(err instanceof Error ? err.message : 'Failed to convert PDF to Excel');
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
    <ToolLayout
      title="PDF to EXCEL"
      description="Extract tables from PDF and convert to Excel format."
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
          title="Extracting tables..."
          description="Analyzing PDF structure and extracting data."
        />
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900">Extraction Complete!</h3>
            <p className="text-gray-500 mt-2">PDF data has been extracted to Excel format.</p>
            <p className="text-sm text-gray-500 mt-1">Note: Table detection is heuristic-based and may require manual adjustment.</p>
          </div>
          <button
            onClick={handleDownload}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Download XLSX
          </button>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Extract Another PDF
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-gray-900">Extraction Failed</h3>
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
