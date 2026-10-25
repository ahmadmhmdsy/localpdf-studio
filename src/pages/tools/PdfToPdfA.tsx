import React, { useState } from 'react';
import { FileBadge, FileCheck, Check, AlertTriangle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { convertToPdfA, PdfALevel } from '../../lib/pdfa';
import { saveAs } from 'file-saver';

type Step = 'upload' | 'level' | 'processing' | 'done' | 'error';

const PDFA_LEVELS: { level: PdfALevel; name: string; description: string }[] = [
  { level: '1b', name: 'PDF/A-1b', description: 'Basic compliance for long-term archiving. Ensures visual reproducibility.' },
  { level: '2b', name: 'PDF/A-2b', description: 'Based on PDF 1.7. Supports transparency, layers, and JPEG2000 compression.' },
  { level: '3b', name: 'PDF/A-3b', description: 'Allows embedding of arbitrary file formats (like source files).' },
];

export default function PdfToPdfA() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<PdfALevel>('2b');
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [resultNotes, setResultNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      setFile(files[0]);
      setStep('level');
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setStep('processing');
    setError(null);

    try {
      const result = await convertToPdfA(file, selectedLevel);
      setResultData(result.bytes);
      setResultNotes(result.notes);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert to PDF/A');
      setStep('error');
    }
  };

  const handleDownload = () => {
    if (resultData && file) {
      const blob = new Blob([resultData], { type: 'application/pdf' });
      const newName = file.name.replace(/\.pdf$/i, `_PDFA-${selectedLevel}.pdf`);
      saveAs(blob, newName);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setSelectedLevel('2b');
    setResultData(null);
    setResultNotes([]);
    setError(null);
  };

  return (
    <ToolLayout
      title="PDF to PDF/A-style"
      description="Apply PDF/A-style metadata only. The output is not validated as PDF/A-conformant; verify with veraPDF or a similar validator after download."
    >
      {step === 'upload' && (
        <FileUploadZone

          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title="Select a PDF to convert"
          subtitle="or drop PDF file here"
        />
      )}

      {step === 'level' && file && (
        <div className="flex flex-col items-center gap-6 py-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 bg-blue-50 px-6 py-4 rounded-xl w-full">
            <FileCheck className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-medium text-[var(--text)]">{file.name}</p>
              <p className="text-sm text-[var(--text-3)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          <div
            role="note"
            className="w-full flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm">
              This tool applies PDF/A-style metadata only. It does not validate or guarantee
              PDF/A conformance. Validate the output with veraPDF for true compliance.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-[var(--text)]">Select the PDF/A level to target</h3>

          <div className="w-full space-y-3">
            {PDFA_LEVELS.map((level) => (
              <label
                key={level.level}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedLevel === level.level
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-[var(--border)] hover:border-[var(--border)]'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedLevel === level.level
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    {selectedLevel === level.level && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pdfa-level"
                      value={level.level}
                      checked={selectedLevel === level.level}
                      onChange={() => setSelectedLevel(level.level)}
                      className="sr-only"
                    />
                    <span className="font-semibold text-[var(--text)]">{level.name}</span>
                  </div>
                  <p className="text-sm text-[var(--text-3)] mt-1">{level.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 text-[var(--text-2)] hover:text-[var(--text)] font-medium border border-[var(--border)] rounded-xl hover:bg-[var(--surface-2)]"
            >
              Cancel
            </button>
            <button
              onClick={handleConvert}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              <FileBadge className="w-5 h-5" />
              Convert to PDF/A
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Converting to PDF/A..."
          description={`Converting to PDF/A-${selectedLevel.toUpperCase()} compliance level.`}
        />
      )}

      {(step === 'done' || step === 'error') && (
        <div className="flex flex-col items-center gap-6 py-12">
          {step === 'done' ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <FileBadge className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[var(--text)]">Converted (best-effort)</h3>
                <p className="text-[var(--text-3)] mt-2 max-w-md">
                  Your PDF has PDF/A-style metadata applied. It is <strong>not</strong> a
                  guaranteed PDF/A — please validate it with veraPDF or a similar tool.
                </p>
              </div>

              {resultNotes.length > 0 && (
                <div
                  role="note"
                  className="w-full max-w-md text-left flex flex-col gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200"
                >
                  <p className="text-sm font-semibold text-amber-900">Notes from the converter:</p>
                  <ul className="text-sm text-amber-900 list-disc pl-5 space-y-1">
                    {resultNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleDownload}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Download PDF/A File
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <FileBadge className="w-10 h-10 text-red-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[var(--text)]">Conversion Failed</h3>
                <p className="text-red-500 mt-2">{error}</p>
              </div>
            </>
          )}
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Convert Another PDF
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
