import React, { useState } from 'react';
import { Presentation, AlertCircle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { convertPowerpointToPdf } from '../../lib/office-pptx';
import { saveAs } from 'file-saver';

type Step = 'upload' | 'processing' | 'done' | 'error';

export default function PowerpointToPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      const selectedFile = files[0];
      if (!selectedFile.name.match(/\.(pptx|ppt)$/i)) {
        setError('Please select a PowerPoint file (.pptx or .ppt)');
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
      setError(err instanceof Error ? err.message : 'Failed to convert PowerPoint to PDF');
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
    <ToolLayout
      title="POWERPOINT to PDF"
      description="Convert PPTX slides to PDF with approximate layout."
    >
      {step === 'upload' && (
        <FileUploadZone
          
          ariaLabel="Select PowerPoint file" onFilesSelected={handleFilesSelected}
          accept={{
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'application/vnd.ms-powerpoint': ['.ppt'],
          }}
          maxFiles={1}
          title="Select a PowerPoint file"
          subtitle="or drop PPTX/PPT file here"
        />
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Converting presentation..."
          description="Extracting slides and converting to PDF pages."
        />
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <Presentation className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-[var(--text)]">Conversion Successful!</h3>
            <p className="text-[var(--text-3)] mt-2">Your presentation has been converted to PDF.</p>
            <p className="text-sm text-[var(--text-3)] mt-1">Each slide is now a PDF page.</p>
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
            Convert Another Presentation
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
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
