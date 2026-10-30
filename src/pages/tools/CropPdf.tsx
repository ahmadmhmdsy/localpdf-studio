import { useState, useRef } from 'react';
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
import { useI18n } from '../../i18n/useI18n';

type Step = 'upload' | 'loading_thumbnail' | 'configure' | 'processing' | 'download';

export default function CropPdf() {
  const { t, toolName, toolDescription } = useI18n();
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
          message: t('tool.common.previewFailed'),
          type: 'error',
          duration: 5000,
        });
        setStep('upload');
      }
    }
  };

  const handleProcess = async () => {
    if (!file || !crop.width || !crop.height) {
      showToast({ message: t('tool.crop.invalidArea'), type: 'warning' });
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
    } catch (error) {
      logError('Error cropping PDF:', error);
      showToast({
        message: t('tool.common.error'),
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
    <ToolLayout title={toolName('crop-pdf')} description={toolDescription('crop-pdf')}>
      {step === 'upload' && (
        <FileUploadZone 
          
          ariaLabel={t('tool.common.selectPdfFile')} onFilesSelected={handleFilesSelected} 
          title={t('tool.common.selectPdfFile')}
          subtitle={t('tool.common.dropPdf')}
          maxFiles={1}
        />
      )}

      {step === 'loading_thumbnail' && (
        <ProcessingState 
          title={t('tool.crop.loadingTitle')}
          description={t('tool.crop.loadingDescription')}
        />
      )}

      {step === 'configure' && file && thumbnailUrl && (
        <div className="w-full max-w-4xl">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm shadow-inner shadow-[var(--border)]/40 p-6 mb-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={20} className="text-red-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[var(--text)]">{file.name}</span>
                  <span className="text-xs text-[var(--text-3)]">{t('tool.crop.hint')}</span>
                </div>
              </div>
              <button 
                onClick={startOver}
                className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label={t('tool.common.removeFile')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex justify-center bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)] overflow-hidden">
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)}
                className="max-h-[60vh]"
              >
                <img 
                  ref={imgRef}
                  src={thumbnailUrl} 
                  alt={t('tool.crop.previewAlt')}
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
              {t('tool.crop.submit')}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title={t('tool.crop.processingTitle')}
          description={t('tool.crop.processingDescription')}
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title={t('tool.crop.successTitle')}
          description={t('tool.crop.successDescription')}
          fileName={`cropped_${file?.name || 'document.pdf'}`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}