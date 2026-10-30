import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { File as FileIcon, X } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { getPdfPageThumbnails } from '../../lib/image';
import { reorderPdfPages } from '../../lib/pdf';
import { logError } from '../../lib/logger';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../i18n/useI18n';

type Step = 'upload' | 'loading_thumbnails' | 'configure' | 'processing' | 'download';

interface PageItem {
  id: string;
  originalIndex: number;
  thumbnailUrl: string;
}

export default function OrganizePdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const { showToast } = useToast();
  const { t, toolName, toolDescription, fileSize } = useI18n();

  const handleFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length > 0) {
      const selectedFile = newFiles[0];
      setFile(selectedFile);
      setStep('loading_thumbnails');
      
      try {
        const thumbnails = await getPdfPageThumbnails(selectedFile);
        const pageItems = thumbnails.map((url, index) => ({
          id: `page-${index}`,
          originalIndex: index,
          thumbnailUrl: url
        }));
        setPages(pageItems);
        setStep('configure');
      } catch (error) {
        logError("Error loading thumbnails:", error);
        showToast({
          message: t('tool.organize.thumbnailsFailed'),
          type: 'error',
          duration: 5000,
        });
        setStep('upload');
      }
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(pages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPages(items);
  };

  const removePage = (index: number) => {
    const newPages = [...pages];
    newPages.splice(index, 1);
    setPages(newPages);
  };

  const handleProcess = async () => {
    if (!file || pages.length === 0) {
      showToast({ message: t('tool.organize.warning'), type: 'warning' });
      return;
    }

    setStep('processing');
    try {
      const newOrder = pages.map(p => p.originalIndex);
      const pdfBytes = await reorderPdfPages(file, newOrder);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultSize(fileSize(blob.size));
      setStep('download');
    } catch (error) {
      logError('Error organizing PDF:', error);
      showToast({
        message: t('tool.organize.error'),
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    }
  };

  const startOver = () => {
    setFile(null);
    setPages([]);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('upload');
  };

  return (
    <ToolLayout 
      title={toolName('organize-pdf')} 
      description={toolDescription('organize-pdf')}
    >
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
          title={t('tool.organize.loadingTitle')} 
          description={t('tool.organize.loadingDescription')}
        />
      )}

      {step === 'configure' && file && (
        <div className="w-full max-w-5xl">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm shadow-inner shadow-[var(--border)]/40 p-6 mb-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={20} className="text-red-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[var(--text)]">{file.name}</span>
                  <span className="text-xs text-[var(--text-3)]">{t('tool.organize.pagesCount', { count: pages.length })}</span>
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

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="pages-grid" direction="horizontal" isDropDisabled={false}>
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="flex flex-wrap gap-4 justify-center"
                  >
                    {pages.map((page, index) => (
                      <Draggable draggableId={page.id} index={index} key={page.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "relative flex flex-col items-center p-2 rounded-xl border bg-[var(--surface)] transition-shadow w-32",
                              snapshot.isDragging ? "shadow-xl border-red-400 z-50 scale-105" : "border-[var(--border)] hover:border-[var(--border)] hover:shadow-md"
                            )}
                          >
                            <button 
                              onClick={() => removePage(index)}
                              className="absolute -top-2 -right-2 p-1 bg-[var(--surface)] text-[var(--text-3)] hover:text-red-500 border border-[var(--border)] rounded-full shadow-sm z-10 transition-colors"
                              aria-label={t('tool.organize.removePage')}
                            >
                              <X size={14} />
                            </button>
                            <div 
                              {...provided.dragHandleProps} 
                              className="w-full h-36 flex items-center justify-center overflow-hidden rounded bg-[var(--surface-2)] mb-2 cursor-grab active:cursor-grabbing"
                            >
                              <img src={page.thumbnailUrl} alt={t('tool.organize.pageAlt', { number: page.originalIndex + 1 })} className="max-w-full max-h-full object-contain pointer-events-none" />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-3)]">{t('tool.organize.pageLabel', { number: page.originalIndex + 1 })}</span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            
            {pages.length === 0 && (
              <div className="text-center py-12 text-[var(--text-3)]">
                {t('tool.organize.allRemoved')}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleProcess}
              disabled={pages.length === 0}
              className="bg-red-600 hover:bg-red-700 disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              {t('tool.organize.submit')}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title={t('tool.organize.processingTitle')} 
          description={t('tool.organize.processingDescription')}
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title={t('tool.organize.successTitle')}
          description={t('tool.organize.successDescription')}
          fileName={`organized_${file?.name || 'document.pdf'}`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}