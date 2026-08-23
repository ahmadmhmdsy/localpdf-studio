import React, { useState, useRef, useEffect } from 'react';
import { File as FileIcon, X, PenTool, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import SignaturePad from 'signature_pad';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { getPdfPageThumbnails } from '../../lib/image';
import { signPdf, SignatureAnnotation } from '../../lib/security';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';

type Step = 'upload' | 'loading_thumbnails' | 'configure' | 'processing' | 'download';

export default function SignPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [signatures, setSignatures] = useState<SignatureAnnotation[]>([]);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentSignatureData, setCurrentSignatureData] = useState<string | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePad | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const { showToast } = useToast();

  // Initialize signature_pad whenever the drawing canvas mounts.
  useEffect(() => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePad(canvas, { backgroundColor: 'rgba(255,255,255,0)' });
    sigPadRef.current = pad;
    return () => {
      pad.off();
      sigPadRef.current = null;
    };
  }, [isDrawing]);

  const handleFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length > 0) {
      const selectedFile = newFiles[0];
      setFile(selectedFile);
      setStep('loading_thumbnails');
      
      try {
        const thumbs = await getPdfPageThumbnails(selectedFile);
        if (thumbs.length > 0) {
          setThumbnails(thumbs);
          setStep('configure');
        } else {
          throw new Error("No pages found");
        }
      } catch (error) {
        logError("Error loading thumbnails:", error);
        showToast({
          message: "Failed to load PDF preview. Please try another file.",
          type: 'error',
          duration: 5000,
        });
        setStep('upload');
      }
    }
  };

  const saveSignature = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      setCurrentSignatureData(sigPadRef.current.toDataURL('image/png'));
      setIsDrawing(false);
    }
  };

  const clearSignature = () => {
    sigPadRef.current?.clear();
    setCurrentSignatureData(null);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || !currentSignatureData) return;
    
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Default size for signature: 20% width, 10% height
    setSignatures([...signatures, {
      imageDataUrl: currentSignatureData,
      x,
      y,
      width: 20,
      height: 10,
      pageIndex: currentPage
    }]);
  };

  const removeSignature = (index: number) => {
    setSignatures(signatures.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (!file) return;

    setStep('processing');
    try {
      const pdfBytes = await signPdf(file, signatures);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setStep('download');
    } catch (error) {
      logError('Error signing PDF:', error);
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
    setThumbnails([]);
    setSignatures([]);
    setCurrentPage(0);
    setCurrentSignatureData(null);
    setIsDrawing(false);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('upload');
  };

  return (
    <ToolLayout 
      title="Sign PDF" 
      description="Sign yourself or request electronic signatures from others."
    >
      {step === 'upload' && (
        <FileUploadZone 
          
          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected} 
          title="Select PDF file"
          subtitle="or drop PDF here"
          maxFiles={1}
        />
      )}

      {step === 'loading_thumbnails' && (
        <ProcessingState 
          title="Loading pages..." 
          description="Please wait while we generate previews of your document."
        />
      )}

      {step === 'configure' && file && thumbnails.length > 0 && (
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8">
          {/* Sidebar Controls */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileIcon size={20} className="text-blue-600" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-[var(--text)] truncate">{file.name}</span>
                    <span className="text-xs text-[var(--text-3)]">{thumbnails.length} pages</span>
                  </div>
                </div>
                <button 
                  onClick={startOver}
                  className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove file"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider">Your Signature</h3>
                
                {!currentSignatureData && !isDrawing ? (
                  <button 
                    onClick={() => setIsDrawing(true)}
                    className="w-full py-3 px-4 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--text-2)] hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <PenTool size={18} />
                    Create Signature
                  </button>
                ) : isDrawing ? (
                  <div className="space-y-3">
                    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]">
                      <canvas
                        ref={sigCanvasRef}
                        className="signature-pad-canvas w-full h-40 cursor-crosshair"
                        aria-label="Signature drawing area"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={clearSignature}
                        className="flex-1 py-2 px-4 border border-[var(--border)] rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors text-sm font-medium"
                      >
                        Clear
                      </button>
                      <button 
                        onClick={saveSignature}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <Check size={16} />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface-2)] flex justify-center items-center h-24">
                      <img src={currentSignatureData!} alt="Signature" className="max-h-full max-w-full object-contain" />
                    </div>
                    <button 
                      onClick={() => {
                        setCurrentSignatureData(null);
                        setIsDrawing(true);
                      }}
                      className="w-full py-2 px-4 border border-[var(--border)] rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors text-sm font-medium"
                    >
                      Change Signature
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
              <h3 className="text-sm font-bold text-[var(--text)] mb-4 uppercase tracking-wider">Placed Signatures ({signatures.length})</h3>
              {signatures.length === 0 ? (
                <p className="text-sm text-[var(--text-3)] italic">Click on the document to place your signature.</p>
              ) : (
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {signatures.map((sig, i) => (
                    <li key={i} className="flex items-center justify-between p-2 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img src={sig.imageDataUrl} alt="Signature thumbnail" className="h-6 w-auto object-contain bg-[var(--surface)] border border-[var(--border)]" />
                        <span className="text-xs text-[var(--text-3)]">Page {sig.pageIndex + 1}</span>
                      </div>
                      <button 
                        onClick={() => removeSignature(i)}
                        className="p-1 text-[var(--text-3)] hover:text-red-500 rounded transition-colors"
                        aria-label={`Remove signature ${i + 1}`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button 
              onClick={handleProcess}
              disabled={signatures.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <PenTool size={20} />
              Sign PDF
            </button>
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-4 mb-4 bg-[var(--surface)] px-4 py-2 rounded-full border border-[var(--border)] shadow-sm">
              <button 
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-1 text-[var(--text-2)] hover:text-blue-600 disabled:text-[var(--text-3)] transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={24} />
              </button>
              <span className="text-sm font-medium text-[var(--text-2)]">
                Page {currentPage + 1} of {thumbnails.length}
              </span>
              <button 
                onClick={() => setCurrentPage(Math.min(thumbnails.length - 1, currentPage + 1))}
                disabled={currentPage === thumbnails.length - 1}
                className="p-1 text-[var(--text-2)] hover:text-blue-600 disabled:text-[var(--text-3)] transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="relative bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)] shadow-inner overflow-auto max-h-[70vh] w-full flex justify-center">
              <div className="relative inline-block cursor-crosshair">
                <img 
                  ref={imgRef}
                  src={thumbnails[currentPage]} 
                  alt={`Page ${currentPage + 1}`} 
                  className="max-w-full h-auto shadow-md"
                  onClick={handleImageClick}
                />
                
                {/* Render signatures for current page */}
                {signatures.filter(s => s.pageIndex === currentPage).map((sig, i) => (
                  <div 
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${sig.x}%`,
                      top: `${sig.y}%`,
                      width: `${sig.width}%`,
                      height: `${sig.height}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <img src={sig.imageDataUrl} alt="Placed signature" className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-[var(--text-3)] mt-4 text-center">
              Create a signature, then click anywhere on the document to place it.
            </p>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title="Signing PDF..." 
          description="Please wait while we add your signatures to the PDF. This is happening locally in your browser."
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title="PDF signed successfully!"
          description="Your signatures have been added to the document."
          fileName={`signed_${file?.name || 'document.pdf'}`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}