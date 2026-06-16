import React, { useRef, useEffect } from 'react';
import { useEditor, ImageAnnotation } from '../../../contexts/EditorContext';

export function ImageAnnotationItem({ annotation, containerRef }: { annotation: ImageAnnotation, containerRef: React.RefObject<HTMLDivElement> }) {
  const { updateAnnotation, selectedAnnotationId, setSelectedAnnotationId, activeTool } = useEditor();
  const isSelected = selectedAnnotationId === annotation.id;
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    return () => {
      cleanupRef.current.forEach(fn => fn());
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedAnnotationId(annotation.id);
    
    if (activeTool !== 'select' && !isSelected) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startAnnX = annotation.x;
    const startAnnY = annotation.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      const deltaX = (moveEvent.clientX - startX) / rect.width;
      const deltaY = (moveEvent.clientY - startY) / rect.height;
      
      updateAnnotation(annotation.id, {
        x: Math.max(0, Math.min(startAnnX + deltaX, 1)),
        y: Math.max(0, Math.min(startAnnY + deltaY, 1))
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    cleanupRef.current.push(() => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    });

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`absolute select-none touch-none -translate-x-1/2 -translate-y-1/2 ${
        isSelected ? 'border-2 border-dashed border-blue-500' : 'border-2 border-transparent'
      } ${activeTool === 'select' || isSelected ? 'cursor-move' : 'cursor-default'}`}
      style={{
        left: `${annotation.x * 100}%`,
        top: `${annotation.y * 100}%`,
        width: `${annotation.width * 100}%`,
        height: `${annotation.height * 100}%`,
        transform: `translate(-50%, -50%) rotate(${annotation.rotation || 0}deg)`,
        opacity: annotation.opacity ?? 1,
      }}
    >
      <img 
        src={annotation.dataUrl} 
        alt="Annotation" 
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      
      {isSelected && (
        <div 
          className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-se-resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = annotation.width;
            const startHeight = annotation.height;

            const handleResizeMove = (moveEvent: PointerEvent) => {
              if (!containerRef.current) return;
              const rect = containerRef.current.getBoundingClientRect();
              
              const deltaX = (moveEvent.clientX - startX) / rect.width;
              const deltaY = (moveEvent.clientY - startY) / rect.height;
              
              updateAnnotation(annotation.id, {
                width: Math.max(0.05, startWidth + deltaX),
                height: Math.max(0.05, startHeight + deltaY)
              });
            };

            const handleResizeUp = () => {
              window.removeEventListener('pointermove', handleResizeMove);
              window.removeEventListener('pointerup', handleResizeUp);
            };

            cleanupRef.current.push(() => {
              window.removeEventListener('pointermove', handleResizeMove);
              window.removeEventListener('pointerup', handleResizeUp);
            });

            window.addEventListener('pointermove', handleResizeMove);
            window.addEventListener('pointerup', handleResizeUp);
          }}
        />
      )}
    </div>
  );
}
