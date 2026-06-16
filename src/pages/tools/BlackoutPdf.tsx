import React, { useState, useRef } from 'react';
import { File as FileIcon, X, Square, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { getPdfPageThumbnails } from '../../lib/image';
import { redactPdf, RedactionRect } from '../../lib/security';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';

type Step = 'upload' | 'loading_thumbnails' | 'configure' | 'processing' | 'download';

export default function BlackoutPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [redactions, setRedactions] = useState<RedactionRect[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const { showToast } = useToast();

  const imgRef = useRef<HTMLImageElement>(null);

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

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDrawing || !startPos || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    setCurrentRect({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      width: Math.abs(currentX - startPos.x),
      height: Math.abs(currentY - startPos.y)
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentRect && currentRect.width > 1 && currentRect.height > 1) {
      setRedactions([...redactions, {
        ...currentRect,
        pageIndex: currentPage
      }]);
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentRect(null);
  };

  const removeRedaction = (index: number) => {
    setRedactions(redactions.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (!file) return;

    setStep('processing');
    try {
      const pdfBytes = await redactPdf(file, redactions);

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setStep('download');
    } catch (error: any) {
      logError('Error blacking out PDF:', error);
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
    setRedactions([]);
    setCurrentPage(0);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('upload');
  };

  return (
    <ToolLayout
      title="Blackout PDF"
      description="Permanently remove text from a document. Blacked-out areas are rasterized so the underlying text is no longer extractable."
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileIcon size={20} className="text-blue-600" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-gray-900 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">{thumbnails.length} pages</span>
                  </div>
                </div>
                <button
                  onClick={startOver}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove file"
                >
                  <X size={20} />
                </button>
              </div>

              <aside
                role="note"
                aria-label="How blackouts work"
                className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  Blacked-out pages are rasterized to PNG. The text behind them becomes
                  un-extractable, but the file size may increase and the output is no longer
                  searchable.
                </p>
              </aside>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Blackouts ({redactions.length})</h3>
                {redactions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Click and drag on the document to mark areas to blackout.</p>
                ) : (
                  <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {redactions.map((rect, i) => (
                      <li key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-4 h-4 bg-black rounded-sm border border-gray-300"></div>
                          <span className="text-xs text-gray-500">Page {rect.pageIndex + 1}</span>
                        </div>
                        <button
                          onClick={() => removeRedaction(i)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          aria-label={`Remove blackout ${i + 1}`}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={redactions.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Square size={20} />
              Apply Blackouts
            </button>
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-4 mb-4 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={24} />
              </button>
              <span className="text-sm font-medium text-gray-700">
                Page {currentPage + 1} of {thumbnails.length}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(thumbnails.length - 1, currentPage + 1))}
                disabled={currentPage === thumbnails.length - 1}
                className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="relative bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner overflow-auto max-h-[70vh] w-full flex justify-center">
              <div
                className="relative inline-block cursor-crosshair"
                onMouseLeave={handleMouseUp}
              >
                <img
                  ref={imgRef}
                  src={thumbnails[currentPage]}
                  alt={`Page ${currentPage + 1}`}
                  className="max-w-full h-auto shadow-md select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  draggable={false}
                />

                {/* Render redactions for current page */}
                {redactions.filter(r => r.pageIndex === currentPage).map((rect, i) => (
                  <div
                    key={i}
                    className="absolute bg-black pointer-events-none"
                    style={{
                      left: `${rect.x}%`,
                      top: `${rect.y}%`,
                      width: `${rect.width}%`,
                      height: `${rect.height}%`,
                    }}
                  />
                ))}

                {/* Render current drawing rectangle */}
                {isDrawing && currentRect && (
                  <div
                    className="absolute bg-black/50 border-2 border-black pointer-events-none"
                    style={{
                      left: `${currentRect.x}%`,
                      top: `${currentRect.y}%`,
                      width: `${currentRect.width}%`,
                      height: `${currentRect.height}%`,
                    }}
                  />
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              Click and drag on the document to mark an area to blackout.
            </p>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Applying blackouts..."
          description="Re-rendering each affected page. This is happening locally in your browser."
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState
          title="Done"
          description="Blackouts have been permanently applied. The underlying text is no longer extractable."
          fileName={`blackout_${file?.name || 'document.pdf'}`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}
