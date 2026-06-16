import React, { useState, useRef, useEffect } from 'react';
import { useEditor, TextAnnotation } from '../../../contexts/EditorContext';

export function TextAnnotationItem({ annotation, containerRef }: { annotation: TextAnnotation, containerRef: React.RefObject<HTMLDivElement> }) {
  const { updateAnnotation, selectedAnnotationId, setSelectedAnnotationId, activeTool, zoom } = useEditor();
  const isSelected = selectedAnnotationId === annotation.id;
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
      cleanupRef.current = null;
    };

    cleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`absolute whitespace-nowrap select-none touch-none p-1 -translate-x-1/2 -translate-y-1/2 ${
        isSelected ? 'border-2 border-dashed border-blue-500' : 'border-2 border-transparent'
      } ${activeTool === 'select' || isSelected ? 'cursor-move' : 'cursor-default'}`}
      style={{
        left: `${annotation.x * 100}%`,
        top: `${annotation.y * 100}%`,
        fontSize: `${annotation.fontSize * zoom}px`, // Scale font size with zoom
        color: annotation.color,
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={annotation.text}
          onChange={(e) => updateAnnotation(annotation.id, { text: e.target.value })}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsEditing(false);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'inherit',
            font: 'inherit',
            width: `${Math.max(1, annotation.text.length)}ch`,
            minWidth: '2ch',
          }}
        />
      ) : (
        annotation.text
      )}
    </div>
  );
}
