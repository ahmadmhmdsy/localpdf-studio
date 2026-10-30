import React, { useState, useRef } from 'react';
import { File as FileIcon, X, Type, ChevronLeft, ChevronRight } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { getPdfPageThumbnails } from '../../lib/image';
import { editPdf, TextAnnotation } from '../../lib/edit';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../i18n/useI18n';

type Step = 'upload' | 'loading_thumbnails' | 'configure' | 'processing' | 'download';

export default function EditPdf() {
  const { t, toolName, fileSize } = useI18n();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  
  const [currentText, setCurrentText] = useState('');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(24);
  
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
          message: t('tool.common.previewFailed'),
          type: 'error',
          duration: 5000,
        });
        setStep('upload');
      }
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || !currentText.trim()) return;
    
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setAnnotations([...annotations, {
      text: currentText,
      x,
      y,
      size: currentSize,
      color: currentColor,
      pageIndex: currentPage
    }]);
    
    setCurrentText(''); // Clear after adding
  };

  const removeAnnotation = (index: number) => {
    setAnnotations(annotations.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (!file) return;

    setStep('processing');
    try {
      const pdfBytes = await editPdf(file, annotations);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultSize(fileSize(blob.size));
      setStep('download');
    } catch (error) {
      logError('Error editing PDF:', error);
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
    setThumbnails([]);
    setAnnotations([]);
    setCurrentPage(0);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('upload');
  };

  return (
    <ToolLayout title={toolName('edit-pdf')} description={t('tool.editPdf.description')}>
      {step === 'upload' && (
        <FileUploadZone 
          
          ariaLabel={t('tool.common.selectPdfFile')} onFilesSelected={handleFilesSelected} 
          title={t('tool.common.selectPdfFile')}
          subtitle={t('tool.common.dropPdf')}
          maxFiles={1}
        />
      )}

      {step === 'loading_thumbnails' && (
        <ProcessingState 
          title={t('tool.common.loadingPages')}
          description={t('tool.common.loadingPagesDescription')}
        />
      )}

      {step === 'configure' && file && thumbnails.length > 0 && (
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8">
          {/* Sidebar Controls */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <FileIcon size={20} className="text-red-600" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-[var(--text)] truncate">{file.name}</span>
                    <span className="text-xs text-[var(--text-3)]">{t('tool.common.pageCount', { count: thumbnails.length })}</span>
                  </div>
                </div>
                <button 
                  onClick={startOver}
                  className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('tool.common.removeFile')}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-2)] mb-1">{t('tool.editPdf.text')}</label>
                  <input
                    type="text"
                    value={currentText}
                    onChange={(e) => setCurrentText(e.target.value)}
                    placeholder={t('tool.editPdf.textPlaceholder')}
                    className="w-full p-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[var(--text-2)] mb-1">{t('tool.editPdf.size')}</label>
                    <input
                      type="number"
                      value={currentSize}
                      onChange={(e) => setCurrentSize(Number(e.target.value))}
                      className="w-full p-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[var(--text-2)] mb-1">{t('tool.editPdf.color')}</label>
                    <div className="flex items-center gap-2 p-1 border border-[var(--border)] rounded-xl h-[50px]">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                        className="w-full h-full cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6">
              <h3 className="text-sm font-bold text-[var(--text)] mb-4 uppercase tracking-wider">{t('tool.editPdf.annotations', { count: annotations.length })}</h3>
              {annotations.length === 0 ? (
                <p className="text-sm text-[var(--text-3)] italic">{t('tool.editPdf.noAnnotations')}</p>
              ) : (
                <ul className="space-y-2 max-h-60 overflow-y-auto pe-2">
                  {annotations.map((ann, i) => (
                    <li key={i} className="flex items-center justify-between p-2 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-[var(--text)] truncate" style={{ color: ann.color }}>"{ann.text}"</span>
                        <span className="text-xs text-[var(--text-3)]">{t('tool.common.page', { page: ann.pageIndex + 1 })}</span>
                      </div>
                      <button 
                        onClick={() => removeAnnotation(i)}
                        className="p-1 text-[var(--text-3)] hover:text-red-500 rounded transition-colors"
                        aria-label={t('tool.editPdf.removeAnnotation', { text: ann.text })}
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
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Type size={20} />
              {t('tool.editPdf.submit')}
            </button>
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-4 mb-4 bg-[var(--surface)] px-4 py-2 rounded-full border border-[var(--border)] shadow-sm">
              <button 
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-1 text-[var(--text-2)] hover:text-red-600 disabled:text-[var(--text-3)] transition-colors"
                aria-label={t('tool.common.previousPage')}
              >
                <ChevronLeft size={24} className="rtl:rotate-180" />
              </button>
              <span className="text-sm font-medium text-[var(--text-2)]">
                {t('tool.common.pageOf', { page: currentPage + 1, total: thumbnails.length })}
              </span>
              <button 
                onClick={() => setCurrentPage(Math.min(thumbnails.length - 1, currentPage + 1))}
                disabled={currentPage === thumbnails.length - 1}
                className="p-1 text-[var(--text-2)] hover:text-red-600 disabled:text-[var(--text-3)] transition-colors"
                aria-label={t('tool.common.nextPage')}
              >
                <ChevronRight size={24} className="rtl:rotate-180" />
              </button>
            </div>

            <div className="relative bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)] shadow-inner overflow-auto max-h-[70vh] w-full flex justify-center">
              <div className="relative inline-block cursor-crosshair">
                <img 
                  ref={imgRef}
                  src={thumbnails[currentPage]} 
                  alt={t('tool.common.page', { page: currentPage + 1 })}
                  className="max-w-full h-auto shadow-md"
                  onClick={handleImageClick}
                />
                
                {/* Render annotations for current page */}
                {annotations.filter(a => a.pageIndex === currentPage).map((ann, i) => (
                  <div 
                    key={i}
                    className="absolute pointer-events-none whitespace-nowrap"
                    style={{
                      left: `${ann.x}%`,
                      top: `${ann.y}%`,
                      transform: 'translate(-50%, -50%)',
                      color: ann.color,
                      fontSize: `${ann.size}px`, // Note: This is an approximation of PDF points to pixels
                      fontWeight: 'bold',
                      textShadow: '0 0 2px white'
                    }}
                  >
                    {ann.text}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-[var(--text-3)] mt-4 text-center">
              {t('tool.editPdf.hint')}
            </p>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title={t('tool.editPdf.processingTitle')}
          description={t('tool.editPdf.processingDescription')}
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title={t('tool.editPdf.successTitle')}
          description={t('tool.editPdf.successDescription')}
          fileName={`edited_${file?.name || 'document.pdf'}`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}