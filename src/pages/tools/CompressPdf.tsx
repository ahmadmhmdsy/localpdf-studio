import { useState } from 'react';
import { File as FileIcon, X, Settings, AlertTriangle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { compressPdf } from '../../lib/compress';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';

type Step = 'upload' | 'configure' | 'processing' | 'download';
type Quality = 'low' | 'medium' | 'high';

export default function CompressPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>('medium');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const [originalSize, setOriginalSize] = useState<string>('');
  const [resultNotes, setResultNotes] = useState<string[]>([]);
  const { showToast } = useToast();

  const handleFilesSelected = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFile(newFiles[0]);
      setOriginalSize((newFiles[0].size / 1024 / 1024).toFixed(2) + ' MB');
      setStep('configure');
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setStep('processing');
    try {
      const result = await compressPdf(file, quality);

      const blob = new Blob([result.bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setResultNotes(result.notes);
      setStep('download');
    } catch (error) {
      logError('Error compressing PDF:', error);
      showToast({
        message: 'An error occurred. Please try again.',
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    }
  };

  const startOver = () => {
    setFile(null);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setResultNotes([]);
    setStep('upload');
  };

  return (
    <ToolLayout
      title="Compress PDF"
      description="Re-pack PDF streams to reduce file size. pdf-lib cannot re-compress embedded images, so size reduction is limited."
    >
      {step === 'upload' && (
        <FileUploadZone

          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected}
          title="Select PDF file"
          subtitle="or drop PDF here"
          maxFiles={1}
        />
      )}

      {step === 'configure' && file && (
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={20} className="text-red-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900">{file.name}</span>
                  <span className="text-xs text-gray-500">{originalSize}</span>
                </div>
              </div>
              <button
                onClick={startOver}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Remove file"
              >
                <X size={20} />
              </button>
            </div>

            <div
              role="note"
              className="mb-6 flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm"
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                This tool cannot re-compress JPEG or PNG images already embedded in the PDF. Real
                size reduction happens only when the source PDF had unoptimized metadata or
                inefficient object streams.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 text-gray-800 font-medium">
                <Settings size={20} className="text-red-600" />
                Compression Level
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setQuality('low')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    quality === 'low'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">Smaller file</div>
                  <div className="text-sm text-gray-500">More aggressive object-stream packing</div>
                </button>

                <button
                  onClick={() => setQuality('medium')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    quality === 'medium'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">Recommended</div>
                  <div className="text-sm text-gray-500">Balanced packing</div>
                </button>

                <button
                  onClick={() => setQuality('high')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    quality === 'high'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">Smoother progress</div>
                  <div className="text-sm text-gray-500">Smaller progress chunks for large files</div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleProcess}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              Compress PDF
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Compressing PDF..."
          description="Please wait while we compress your document. This is happening locally in your browser."
        />
      )}

      {step === 'download' && resultUrl && (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
          <DownloadState
            title="Done"
            description={`Re-packed from ${originalSize} to ${resultSize}. If the file got larger, the source PDF was already well-optimized.`}
            fileName={`compressed_${file?.name || 'document.pdf'}`}
            fileUrl={resultUrl}
            fileSize={resultSize}
            onStartOver={startOver}
          />
          {resultNotes.length > 0 && (
            <div
              role="note"
              className="text-left p-4 rounded-xl bg-amber-50 border border-amber-200"
            >
              <p className="text-sm font-semibold text-amber-900 mb-1">Notes</p>
              <ul className="text-sm text-amber-900 list-disc pl-5 space-y-1">
                {resultNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}