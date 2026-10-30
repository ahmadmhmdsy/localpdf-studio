import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RotateCw, Trash2 } from 'lucide-react';
import { PageMeta } from '../../contexts/EditorContext';
import { useEffect, useState, useRef } from 'react';
import { pdfjsLib } from '../../lib/pdfjs';
import { logError } from '../../lib/logger';
import { useI18n } from '../../i18n/useI18n';

interface SortableThumbnailProps {
  page: PageMeta;
  index: number;
  isActive: boolean;
  pdfJsDoc: pdfjsLib.PDFDocumentProxy;
  onClick: () => void;
  onRotate: React.MouseEventHandler<HTMLButtonElement>;
  onDelete: React.MouseEventHandler<HTMLButtonElement>;
}

function SortableThumbnailInner({
  page,
  index,
  isActive,
  pdfJsDoc,
  onClick,
  onRotate,
  onDelete
}: SortableThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let renderTask: pdfjsLib.RenderTask | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoadedRef.current) {
            const loadThumbnail = async () => {
              try {
                const pdfPage = await pdfJsDoc.getPage(page.originalIndex + 1);
                const viewport = pdfPage.getViewport({ scale: 0.2 });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                
                if (!context) return;
                
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                renderTask = pdfPage.render({
                  canvasContext: context,
                  viewport: viewport,
                  canvas: canvas
                });
                
                await renderTask.promise;
                
                if (isMounted) {
                  setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.5));
                  hasLoadedRef.current = true;
                }
              } catch (error) {
                const normalizedError = error instanceof Error ? error : new Error(String(error));
                if (normalizedError.name !== 'RenderingCancelledException') {
                  logError(`Error generating thumbnail for page ${page.originalIndex + 1}:`, normalizedError);
                }
              }
            };
            loadThumbnail();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      isMounted = false;
      observer.disconnect();
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfJsDoc, page.originalIndex]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`relative cursor-pointer group rounded-lg p-2 transition-all ${
        isActive ? 'bg-red-50 border-2 border-red-500' : 'hover:bg-[var(--surface-2)] border-2 border-transparent'
      }`}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div ref={containerRef} className="aspect-[1/1.4] bg-[var(--surface)] shadow-sm border border-[var(--border)] rounded overflow-hidden flex items-center justify-center relative">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={t('editor.thumb.page', { page: index + 1 })} 
            className="w-full h-full object-contain transition-transform duration-300"
            style={{ transform: `rotate(${page.rotation}deg)` }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-[var(--surface-2)] animate-pulse" />
        )}
        
        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button 
            onClick={onRotate}
            className="p-1.5 bg-[var(--surface)] text-[var(--text-2)] rounded-full hover:bg-[var(--surface-2)] hover:text-blue-600 transition-colors shadow-sm"
            aria-label={t('editor.thumb.rotateLabel')}
            title={t('editor.thumb.rotate')}
          >
            <RotateCw size={14} />
          </button>
          <button 
            onClick={onDelete}
            className="p-1.5 bg-[var(--surface)] text-[var(--text-2)] rounded-full hover:bg-[var(--surface-2)] hover:text-red-600 transition-colors shadow-sm"
            aria-label={t('editor.thumb.delete')}
            title={t('editor.thumb.delete')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className={`text-center mt-2 text-xs font-medium ${isActive ? 'text-red-600' : 'text-[var(--text-3)]'}`}>
        {index + 1}
      </div>
    </div>
  );
}

export const SortableThumbnail = memo(SortableThumbnailInner);