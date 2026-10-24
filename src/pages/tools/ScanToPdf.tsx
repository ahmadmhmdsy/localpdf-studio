import { useState, useRef, useEffect } from 'react';
import { X, Plus, Image as ImageIcon } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { jpgsToPdf } from '../../lib/image';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';

type Step = 'capture' | 'preview' | 'processing' | 'download';

export default function ScanToPdf() {
  const [step, setStep] = useState<Step>('capture');
  const [images, setImages] = useState<string[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const { showToast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser or context.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setHasCamera(true);
    } catch (err) {
      logError("Error accessing camera:", err);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (step === 'capture') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setImages(prev => [...prev, dataUrl]);
        setStep('preview');
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (images.length === 1) {
      setStep('capture');
    }
  };

  const handleProcess = async () => {
    if (images.length === 0) return;

    setStep('processing');
    try {
      // Convert data URLs to File objects
      const files = await Promise.all(images.map(async (dataUrl, i) => {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], `scan_${i}.jpg`, { type: 'image/jpeg' });
      }));

      const pdfBytes = await jpgsToPdf(files);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setStep('download');
    } catch (error) {
      logError('Error creating PDF:', error);
      showToast({
        message: 'An error occurred. Please try again.',
        type: 'error',
        duration: 5000,
      });
      setStep('preview');
    }
  };

  const startOver = () => {
    setImages([]);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('capture');
  };

  return (
    <ToolLayout 
      title="Scan to PDF" 
      description="Capture document scans from your camera and convert them instantly to PDF."
    >
      {step === 'capture' && (
        <div className="w-full max-w-3xl mx-auto">
          {!hasCamera ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center">
              <p className="font-semibold mb-2">Camera access denied or not available.</p>
              <p className="text-sm">Please allow camera access in your browser settings to use this tool.</p>
            </div>
          ) : (
            <div className="bg-black rounded-2xl overflow-hidden relative shadow-xl">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-auto max-h-[60vh] object-contain"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-6">
                {images.length > 0 && (
                  <button 
                    onClick={() => setStep('preview')}
                    className="bg-[var(--surface)]/20 hover:bg-[var(--surface)]/30 text-white p-3 rounded-full backdrop-blur-sm transition-colors"
                    title="View captured images"
                  >
                    <ImageIcon size={24} />
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                      {images.length}
                    </span>
                  </button>
                )}
                
                <button 
                  onClick={captureImage}
                  className="w-16 h-16 bg-[var(--surface)] rounded-full border-4 border-[var(--border)] hover:border-white hover:scale-105 transition-all flex items-center justify-center shadow-lg"
                  aria-label="Capture image from camera"
                >
                  <div className="w-12 h-12 bg-[var(--surface)] rounded-full border border-[var(--border)]"></div>
                </button>
                
                {images.length > 0 && (
                  <div className="w-12"></div> // Spacer for balance
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div className="w-full max-w-5xl">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--text)]">Captured Pages ({images.length})</h3>
              <button 
                onClick={() => setStep('capture')}
                className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add more pages
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img, index) => (
                <div key={index} className="relative group rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-2)] aspect-[3/4]">
                  <img src={img} alt={`Scan ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => removeImage(index)}
                      className="bg-[var(--surface)] text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors shadow-lg"
                      title="Remove page"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleProcess}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              Convert to PDF
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title="Creating PDF..." 
          description="Please wait while we convert your scanned images to a PDF document."
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title="PDF created successfully!"
          description="Your scanned document is ready to download."
          fileName="scanned_document.pdf"
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}