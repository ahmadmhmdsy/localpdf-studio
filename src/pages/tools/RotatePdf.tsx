import { useState } from 'react';
import { File as FileIcon, X } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { rotatePdf } from '../../lib/pdf';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';

type Step = 'upload' | 'configure' | 'processing' | 'download';

export default function RotatePdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<number>(90);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const { showToast } = useToast();

  const handleFilesSelected = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFile(newFiles[0]);
      setStep('configure');
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setStep('processing');
    try {
      const pdfBytes = await rotatePdf(file, angle);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setStep('download');
    } catch (error: any) {
      logError('Error rotating PDF:', error);
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
    setAngle(90);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('upload');
  };

  return (
    <ToolLayout 
      title="Rotate PDF" 
      description="Rotate your PDFs the way you need them. You can even rotate multiple PDFs at once!"
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
        <div className="w-full max-w-4xl">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={24} className="text-purple-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900 text-lg">{file.name}</span>
                  <span className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
              <button 
                onClick={startOver}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Remove file"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Rotation Angle
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setAngle(90)}
                  className={`px-6 py-3 rounded-xl border font-medium transition-colors ${angle === 90 ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Right (90°)
                </button>
                <button
                  onClick={() => setAngle(180)}
                  className={`px-6 py-3 rounded-xl border font-medium transition-colors ${angle === 180 ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Upside Down (180°)
                </button>
                <button
                  onClick={() => setAngle(270)}
                  className={`px-6 py-3 rounded-xl border font-medium transition-colors ${angle === 270 ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Left (270°)
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleProcess}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              Rotate PDF
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title="Rotating PDF..." 
          description="Please wait while we rotate your document. This is happening locally in your browser."
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title="PDF rotated successfully!"
          description="Your document has been rotated."
          fileName={`rotated_${file?.name || 'document.pdf'}`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}
