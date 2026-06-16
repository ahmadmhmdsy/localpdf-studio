import { useState, useRef, useEffect } from 'react';
import { File as FileIcon, X, Crop as CropIcon } from 'lucide-react';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { getPdfPageThumbnails } from '../../lib/image';
import { cropPdf, CropRect } from '../../lib/edit';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';

type Step = 'upload' | 'loading_thumbnail' | 'configure' | 'processing' | 'download';

export default function CropPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80
  });
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const { showToast } = useToast();

  const imgRef = useRef<HTMLImageElement>(null);

  const handleFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length > 0) {
      const selectedFile = newFiles[0];
      setFile(selectedFile);
      setStep('loading_thumbnail');
      
      try {
        const thumbnails = await getPdfPageThumbnails(selectedFile);
        if (thumbnails.length > 0) {
          setThumbnailUrl(thumbnails[0]);
          setStep('configure');
        } else {
          throw new Error("No pages found");
        }
      } catch (error) {
        logError("Error loading thumbnail:", error);
        showToast({
          message: "Failed to load PDF preview. Please try another file.",
          type: 'error',
          duration: 5000,
        });
        setStep('upload');
      }
    }
  };

  const handleProcess = async () => {
    if (!file || !crop.width || !crop.height) {
      showToast({ message: 'Please select a valid crop area.', type: 'warning' });
      return;
    }

    setStep('processing');
    try {
      // Ensure crop is in percentages
      let cropPercentages: CropRect;
      
      if (crop.unit === 'px' && imgRef.current) {
        const img = imgRef.current;
        cropPercentages = {
          x: (crop.x / img.width) * 100,
          y: (crop.y / img.height) * 100,
          width: (crop.width / img.width) * 100,
          height: (crop.height / img.height) * 100
        };
      } else {
        cropPercentages = {
          x: crop.x,
          y: crop.y,
          width: crop.width,
          height: crop.height
        };
      }

      const pdfBytes = await cropPdf(file, cropPercentages);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setStep('download');
    } catch (error: any) {
      logError('Error cropping PDF:', error);
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
    setThumbnailUrl(null);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('upload');
  };

  return (
    <ToolLayout 
      title="Crop PDF" 
      description="Crop PDF online to a selected area, adjust margin size swiftly. The crop area will be applied to all pages."
    >
      {step === 'upload' && (
        <FileUploadZone 
          
          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected} 
          title="Select PDF file"
          subtitle="or drop PDF here"
          maxFiles={1}
        />
      )}

      {step === 'loading_thumbnail' && (
        <ProcessingState 
          title="Loading preview..." 
          description="Please wait while we generate a preview of your document."
        />
      )}

      {step === 'configure' && file && thumbnailUrl && (
        <div className="w-full max-w-4xl">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={20} className="text-red-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900">{file.name}</span>
                  <span className="text-xs text-gray-500">Draw a rectangle to crop all pages</span>
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

            <div className="flex justify-center bg-gray-50 p-4 rounded-xl border border-gray-200 overflow-hidden">
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)}
                className="max-h-[60vh]"
              >
                <img 
                  ref={imgRef}
                  src={thumbnailUrl} 
                  alt="PDF Preview" 
                  className="max-h-[60vh] object-contain shadow-sm"
                />
              </ReactCrop>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleProcess}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg flex items-center gap-2"
            >
              <CropIcon size={24} />
              Crop PDF
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title="Cropping PDF..." 
          description="Please wait while we apply the crop to all pages. This is happening locally in your browser."
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title="PDF cropped successfully!"
          description="Your document has been cropped to the selected area."
          fileName={`cropped_${file?.name || 'document.pdf'}`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}
