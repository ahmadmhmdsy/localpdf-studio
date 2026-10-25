import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Download } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { repairPdf, RepairResult } from '../../lib/repair';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';
import { saveAs } from 'file-saver';

type Step = 'upload' | 'processing' | 'done' | 'error';

export default function RepairPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<RepairResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const failWith = (message: string) => {
    setError(message);
    showToast({ message, type: 'error', duration: 5000 });
    setStep('error');
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      setFile(files[0]);
      handleRepair(files[0]);
    }
  };

  const handleRepair = async (selectedFile: File) => {
    setStep('processing');
    setError(null);
    setResult(null);

    try {
      const repairResult = await repairPdf(selectedFile);

      // A repair either produces a real document or reports the failure; there
      // is no placeholder file to download (roadmap A7.9).
      if (repairResult.success && repairResult.data) {
        setResult(repairResult);
        setStep('done');
      } else {
        failWith(repairResult.message || 'This PDF could not be repaired.');
      }
    } catch (err) {
      logError('Error repairing PDF:', err);
      failWith(err instanceof Error ? err.message : 'Failed to repair PDF');
    }
  };

  const handleDownload = () => {
    if (result?.data && file) {
      const blob = new Blob([result.data], { type: 'application/pdf' });
      const newName = file.name.replace(/\.pdf$/i, '_repaired.pdf');
      saveAs(blob, newName);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <ToolLayout
      title="Repair PDF"
      description="Attempt to repair a damaged PDF by re-parsing and re-saving it. A file that cannot be repaired reports a clear failure instead of producing a placeholder."
    >
      {step === 'upload' && (
        <FileUploadZone
          
          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title="Select a corrupted PDF"
          subtitle="or drop PDF file here"
        />
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Attempting repair..."
          description="Analyzing and fixing PDF structure issues."
        />
      )}

      {step === 'done' && result?.data && (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-green-100">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">Repair Successful!</h3>
            <p className="mt-2 text-[var(--text-3)]">{result.message}</p>
          </div>

          {result.issuesFixed.length > 0 && (
            <div className="w-full max-w-lg bg-[var(--surface-2)] rounded-xl p-4 shadow-inner shadow-[var(--border)]/40">
              <h4 className="font-medium text-[var(--text)] mb-3">Issues Fixed:</h4>
              <ul className="space-y-2">
                {result.issuesFixed.map((issue, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download Repaired PDF
          </button>

          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Repair Another PDF
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12" role="alert">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">Repair Failed</h3>
            <p className="text-red-500 mt-2">{error}</p>
            <p className="text-[var(--text-3)] mt-4 text-sm">
              For severely damaged files, a server-side PDF repair service may be able to recover
              more content.
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
