import React, { useState } from 'react';
import { FileSpreadsheet, FileCheck, AlertCircle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { convertExcelToPdf } from '../../lib/office-excel';
import { saveAs } from 'file-saver';

type Step = 'upload' | 'processing' | 'done' | 'error';

export default function ExcelToPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      const selectedFile = files[0];
      if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError('Please select an Excel file (.xlsx, .xls) or CSV');
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
      const result = await convertExcelToPdf(selectedFile);
      setResultData(result);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert Excel to PDF');
      setStep('error');
    }
  };

  const handleDownload = () => {
    if (resultData && file) {
      const blob = new Blob([resultData], { type: 'application/pdf' });
      const newName = file.name.replace(/\.(xlsx|xls|csv)$/i, '.pdf');
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
      title="EXCEL to PDF"
      description="Convert Excel spreadsheets to PDF format with tables preserved."
    >
      {step === 'upload' && (
        <FileUploadZone
          
          ariaLabel="Select Excel file" onFilesSelected={handleFilesSelected}
          accept={{
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv'],
          }}
          maxFiles={1}
          title="Select an Excel file"
          subtitle="or drop XLSX/XLS/CSV file here"
        />
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Converting to PDF..."
          description="Processing spreadsheets and creating PDF tables."
        />
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900">Conversion Successful!</h3>
            <p className="text-gray-500 mt-2">Your Excel spreadsheet has been converted to PDF.</p>
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
            Convert Another File
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
