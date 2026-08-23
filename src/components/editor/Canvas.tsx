import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { pdfjsLib } from '../../lib/pdfjs';
import { logError } from '../../lib/logger';
import AnnotationLayer from './AnnotationLayer';

// Debounce utility for delaying canvas re-render during zoom
function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

export default function Canvas() {
  const { pdfJsDoc, pages, currentPage, zoom, setZoom, darkMode, activeTool } = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  
  // Track render scale separately from visual zoom for dynamic resolution
  const [renderScale, setRenderScale] = useState(zoom);
  const [isZooming, setIsZooming] = useState(false);
  const zoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch handling for pinch-to-zoom
  const lastTouchDistanceRef = useRef<number>(0);
  const isPinchingRef = useRef<boolean>(false);
  const touchStartZoomRef = useRef<number>(zoom);

  // Debounced canvas re-render - only re-render after zoom stops
  const debouncedSetRenderScale = useDebouncedCallback((newZoom: number) => {
    setRenderScale(newZoom);
    setIsZooming(false);
  }, 150); // 150ms delay after zoom stops

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY * -0.01;
        const newZoom = Math.min(Math.max(0.1, zoom + zoomDelta), 5);
        
        // Immediately update visual zoom (CSS transform)
        setZoom(newZoom);
        setIsZooming(true);
        
        // Debounce the actual canvas re-render
        debouncedSetRenderScale(newZoom);
        
        // Clear existing timeout
        if (zoomTimeoutRef.current) {
          clearTimeout(zoomTimeoutRef.current);
        }
        
        // Fallback: ensure we stop zooming state if no more events
        zoomTimeoutRef.current = setTimeout(() => {
          setIsZooming(false);
        }, 200);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, [zoom, setZoom, debouncedSetRenderScale]);

  // Main canvas rendering effect - triggered by renderScale changes (debounced)
  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null;
    let isCancelled = false;

    const renderPage = async () => {
      const pageMeta = pages[currentPage - 1];
      if (!pdfJsDoc || !canvasRef.current || !containerRef.current || !pageMeta) return;

      setIsRendering(true);
      try {
        const page = await pdfJsDoc.getPage(pageMeta.originalIndex + 1);
        
        // Use device pixel ratio for sharp rendering on high-DPI displays
        const pixelRatio = window.devicePixelRatio || 1;
        const scale = renderScale * pixelRatio;
        const viewport = page.getViewport({ scale, rotation: pageMeta.rotation });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context || isCancelled) return;

        // Set canvas dimensions to match the PDF at the render scale
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        canvas: canvas
      };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (error) {
        if (error.name !== 'RenderingCancelledException' && !isCancelled) {
          logError('Error rendering page:', error);
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfJsDoc, pages, currentPage, renderScale]); // Use renderScale instead of zoom

  // Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Start pinch gesture
      isPinchingRef.current = true;
      lastTouchDistanceRef.current = getTouchDistance(e.touches);
      touchStartZoomRef.current = zoom;
      setIsZooming(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPinchingRef.current && e.touches.length === 2) {
      e.preventDefault(); // Prevent page scroll during pinch
      
      const currentDistance = getTouchDistance(e.touches);
      const scaleChange = currentDistance / lastTouchDistanceRef.current;
      const newZoom = Math.min(Math.max(0.1, touchStartZoomRef.current * scaleChange), 5);
      
      setZoom(newZoom);
      debouncedSetRenderScale(newZoom);
      
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      zoomTimeoutRef.current = setTimeout(() => {
        setIsZooming(false);
      }, 200);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      isPinchingRef.current = false;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool === 'pan') {
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
      if (containerRef.current) {
        setScrollLeft(containerRef.current.scrollLeft);
        setScrollTop(containerRef.current.scrollTop);
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning || activeTool !== 'pan' || !containerRef.current) return;
    
    const dx = e.clientX - startPan.x;
    const dy = e.clientY - startPan.y;
    
    containerRef.current.scrollLeft = scrollLeft - dx;
    containerRef.current.scrollTop = scrollTop - dy;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  if (!pdfJsDoc || pages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">No document loaded.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`flex-1 overflow-auto flex items-center justify-center p-8 relative transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gray-200'} ${activeTool === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
      style={{ touchAction: 'none' }} // Prevent browser handling of touch gestures
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className={`relative shadow-2xl bg-white transition-opacity duration-200 ${isRendering || isZooming ? 'opacity-70' : 'opacity-100'}`}
        style={{
          // Use CSS transform for visual scaling when zoom differs from render scale
          // This handles both button zoom and wheel zoom
          transform: zoom !== renderScale ? `scale(${zoom / renderScale})` : 'none',
          transformOrigin: 'center center',
          transition: isZooming ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        <canvas 
          ref={canvasRef} 
          className="block" 
          style={{ 
            filter: darkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
            // Visual size matches the render scale
            width: '100%',
            height: 'auto',
          }}
        />
        <AnnotationLayer />
        {(isRendering || isZooming) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 text-white rounded-lg text-sm">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {isRendering ? 'Rendering...' : 'Zooming...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}