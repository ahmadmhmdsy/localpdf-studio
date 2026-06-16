import { useRef, useState, useEffect } from 'react';
import { useEditor, TextAnnotation, ImageAnnotation, RedactAnnotation, CropAnnotation, DrawAnnotation, Point } from '../../contexts/EditorContext';
import { ANNOTATION_COLORS } from '../../constants/colors';
import TextAnnotationItem from './annotations/TextAnnotationItem';
import ImageAnnotationItem from './annotations/ImageAnnotationItem';
import RedactAnnotationItem from './annotations/RedactAnnotationItem';
import CropAnnotationItem from './annotations/CropAnnotationItem';
import DrawAnnotationItem from './annotations/DrawAnnotationItem';

export default function AnnotationLayer() {
  const { 
    pages, 
    currentPage, 
    annotations, 
    activeTool, 
    addAnnotation, 
    setSelectedAnnotationId,
    setActiveTool
  } = useEditor();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingSvgRef = useRef<SVGSVGElement>(null);
  const drawingPolylineRef = useRef<SVGPolylineElement>(null);
  const currentDrawingRef = useRef<Point[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pageMeta = pages[currentPage - 1];
  
  if (!pageMeta) return null;

  const pageAnnotations = annotations.filter(a => a.pageId === pageMeta.id);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool === 'draw') {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (!containerRef.current || !drawingSvgRef.current || !drawingPolylineRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      currentDrawingRef.current = [{ x, y }];
      drawingSvgRef.current.style.display = 'block';
      drawingPolylineRef.current.setAttribute('points', `${x * 100}%,${y * 100}%`);
      
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const moveX = (moveEvent.clientX - rect.left) / rect.width;
        const moveY = (moveEvent.clientY - rect.top) / rect.height;
        currentDrawingRef.current.push({ x: moveX, y: moveY });
        
        const pointsStr = currentDrawingRef.current.map(p => `${p.x * 100}%,${p.y * 100}%`).join(' ');
        drawingPolylineRef.current?.setAttribute('points', pointsStr);
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        
        const points = [...currentDrawingRef.current];
        currentDrawingRef.current = [];
        if (drawingSvgRef.current) drawingSvgRef.current.style.display = 'none';
        if (drawingPolylineRef.current) drawingPolylineRef.current.setAttribute('points', '');
        
        if (points.length > 1) {
          addAnnotation({
            id: `draw-${Date.now()}`,
            pageId: pageMeta.id,
            type: 'draw',
            points: points,
            color: 'black',
            strokeWidth: 2,
          });
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      cleanupRef.current = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
      return;
    }

    if (activeTool === 'text') {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      addAnnotation({
        id: `text-${Date.now()}`,
        pageId: pageMeta.id,
        type: 'text',
        text: 'New Text',
        x,
        y,
        fontSize: 24,
        color: 'red',
      });
      setActiveTool('select');
    } else if (activeTool === 'redact') {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      addAnnotation({
        id: `redact-${Date.now()}`,
        pageId: pageMeta.id,
        type: 'redact',
        x,
        y,
        width: 0.2, // Default 20% width
        height: 0.05, // Default 5% height
        color: 'black',
      });
      setActiveTool('select');
    } else if (activeTool === 'crop') {
      if (!containerRef.current) return;

      // Check if a crop annotation already exists for this page
      const existingCrop = annotations.find(a => a.pageId === pageMeta.id && a.type === 'crop');
      if (existingCrop) {
        setSelectedAnnotationId(existingCrop.id);
        setActiveTool('select');
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      addAnnotation({
        id: `crop-${Date.now()}`,
        pageId: pageMeta.id,
        type: 'crop',
        x,
        y,
        width: 0.5, // Default 50% width
        height: 0.5, // Default 50% height
      });
      setActiveTool('select');
    } else {
      // If clicking on empty space with select tool, deselect
      if (e.target === containerRef.current) {
        setSelectedAnnotationId(null);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 z-10 ${activeTool !== 'pan' && activeTool !== 'select' ? 'touch-none' : ''}`}
      onPointerDown={handlePointerDown}
      style={{ cursor: activeTool === 'text' ? 'text' : activeTool === 'draw' ? 'crosshair' : 'default' }}
    >
      <svg 
        ref={drawingSvgRef}
        className="absolute inset-0 w-full h-full pointer-events-none" 
        style={{ display: 'none' }}
      >
        <polyline
          ref={drawingPolylineRef}
          points=""
          fill="none"
          stroke={ANNOTATION_COLORS[0].value}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {pageAnnotations.map((ann) => {
        if (ann.type === 'text') {
          return (
            <TextAnnotationItem 
              key={ann.id} 
              annotation={ann as TextAnnotation} 
              containerRef={containerRef}
            />
          );
        } else if (ann.type === 'image') {
          return (
            <ImageAnnotationItem 
              key={ann.id} 
              annotation={ann as ImageAnnotation} 
              containerRef={containerRef}
            />
          );
        } else if (ann.type === 'redact') {
          return (
            <RedactAnnotationItem 
              key={ann.id} 
              annotation={ann as RedactAnnotation} 
              containerRef={containerRef}
            />
          );
        } else if (ann.type === 'crop') {
          return (
            <CropAnnotationItem 
              key={ann.id} 
              annotation={ann as CropAnnotation} 
              containerRef={containerRef}
            />
          );
        } else if (ann.type === 'draw') {
          return (
            <DrawAnnotationItem 
              key={ann.id} 
              annotation={ann as DrawAnnotation} 
            />
          );
        }
        return null;
      })}
    </div>
  );
}
