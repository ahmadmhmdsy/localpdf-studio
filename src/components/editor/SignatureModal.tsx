import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Check, RotateCcw, Type, PenTool } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

type SignatureMode = 'draw' | 'type';

export default function SignatureModal({ isOpen, onClose, onSave }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [typedSignature, setTypedSignature] = useState('');

  const clearCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
    }
    setIsEmpty(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    clearCanvas();
    setMode('draw');
    setTypedSignature('');

    return () => {
      // Cleanup: reset drawing state and clear canvas when modal closes
      // or before re-running on dependency change, so the next open
      // doesn't show stale ink.
      setIsDrawing(false);
      setIsEmpty(true);
      if (canvasRef.current) {
        const c = canvasRef.current.getContext('2d');
        c?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        c?.beginPath();
      }
    };
  }, [isOpen, clearCanvas]);

  // Global pointerup so drawing always ends even if the pointer leaves the
  // canvas before being released. Without this, `isDrawing` can stay `true`
  // and a later mouse-move anywhere on the page would draw a stray line.
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerUp = () => setIsDrawing(false);
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [isOpen]);

  // Focus trap: trap focus inside modal when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus the first focusable element on open
    requestAnimationFrame(() => {
      const modal = modalRef.current;
      if (!modal) return;
      const firstBtn = modal.querySelector<HTMLElement>('button');
      firstBtn?.focus();
    });

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setIsEmpty(false);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleSave = () => {
    if (mode === 'type' && typedSignature.trim()) {
      // Create a canvas with the typed text rendered as an image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.font = '36px "Brush Script MT", cursive, "Segoe Script", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
      return;
    }

    if (!canvasRef.current || isEmpty) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Signature creation dialog"
    >
      <div ref={modalRef} className="bg-[var(--surface)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text)]">Create Signature</h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-3)] hover:text-[var(--text-2)] rounded-full hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Close signature dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex border-b border-[var(--border)]" role="tablist" aria-label="Signature input method">
          <button
            onClick={() => setMode('draw')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'draw'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            }`}
            role="tab"
            aria-selected={mode === 'draw'}
            aria-label="Draw signature"
          >
            <PenTool size={16} />
            Draw
          </button>
          <button
            onClick={() => { setMode('type'); requestAnimationFrame(() => typeInputRef.current?.focus()); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'type'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            }`}
            role="tab"
            aria-selected={mode === 'type'}
            aria-label="Type signature"
          >
            <Type size={16} />
            Type
          </button>
        </div>

        {mode === 'draw' ? (
          <div className="p-6 bg-[var(--surface-2)] flex-1 flex flex-col items-center justify-center">
            <div className="bg-[var(--surface)] rounded-lg border-2 border-dashed border-[var(--border)] w-full h-48 relative overflow-hidden shadow-sm">
              <canvas
                ref={canvasRef}
                width={400}
                height={192}
                className="w-full h-full cursor-crosshair touch-none"
                aria-label="Signature drawing canvas"
                role="img"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
              />
              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[var(--text-3)] font-medium">
                  Draw your signature here
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-[var(--surface-2)] flex-1 flex flex-col items-center justify-center gap-4">
            <label htmlFor="signature-type-input" className="text-sm text-[var(--text-2)] font-medium">
              Type your signature
            </label>
            <input
              ref={typeInputRef}
              id="signature-type-input"
              type="text"
              value={typedSignature}
              onChange={(e) => { setTypedSignature(e.target.value); setIsEmpty(!e.target.value.trim()); }}
              placeholder="John Doe"
              className="w-full max-w-xs px-4 py-3 text-2xl text-center border-2 border-dashed border-[var(--border)] rounded-lg bg-[var(--surface)] shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
              style={{ fontFamily: '"Brush Script MT", cursive, "Segoe Script", serif' }}
              aria-label="Type your signature text"
            />
            <p className="text-xs text-[var(--text-3)]">This will be rendered in a cursive font</p>
          </div>
        )}

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          {mode === 'draw' ? (
            <button
              onClick={clearCanvas}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              aria-label="Clear signature canvas"
            >
              <RotateCcw size={16} />
              Clear
            </button>
          ) : (
            <button
              onClick={() => { setTypedSignature(''); setIsEmpty(true); typeInputRef.current?.focus(); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              aria-label="Clear typed signature"
            >
              <RotateCcw size={16} />
              Clear
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              aria-label="Cancel signature"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isEmpty}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              aria-label="Save and add signature to document"
            >
              <Check size={16} />
              Save & Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
