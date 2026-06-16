import React from 'react';
import { useEditor, DrawAnnotation } from '../../../contexts/EditorContext';

export function DrawAnnotationItem({ annotation }: { annotation: DrawAnnotation }) {
  const { selectedAnnotationId, setSelectedAnnotationId, activeTool } = useEditor();
  const isSelected = selectedAnnotationId === annotation.id;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
    >
      <svg 
        className={`w-full h-full pointer-events-auto ${activeTool === 'select' ? 'cursor-pointer' : 'cursor-default'}`}
        onPointerDown={(e) => {
          if (activeTool === 'select') {
            e.stopPropagation();
            setSelectedAnnotationId(annotation.id);
          }
        }}
      >
        <polyline
          points={annotation.points.map(p => `${p.x * 100}%,${p.y * 100}%`).join(' ')}
          fill="none"
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isSelected ? 'drop-shadow-md ring-2 ring-blue-500 ring-opacity-50' : ''}
        />
      </svg>
    </div>
  );
}
