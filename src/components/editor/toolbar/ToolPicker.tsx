import { MousePointer2, Hand, Type, Square, PenTool, Image as ImageIcon, Edit3, Crop } from 'lucide-react';

interface ToolPickerProps {
  activeTool: string | null;
  onSelect: (tool: string | null) => void;
  onOpenSignature: () => void;
  onPickImage: () => void;
}

export function ToolPicker({ activeTool, onSelect, onOpenSignature, onPickImage }: ToolPickerProps) {
  const toolButtonClass = (isActive: boolean, color: 'red' | 'emerald' = 'red') =>
    `p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md transition-colors ${
      isActive
        ? color === 'red'
          ? 'bg-red-50 text-red-600'
          : 'bg-emerald-50 text-emerald-600'
        : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]'
    }`;

  return (
    <div className="flex items-center gap-2 border-r border-[var(--border)] pr-4">
      <button
        onClick={() => onSelect('select')}
        className={toolButtonClass(activeTool === 'select' || !activeTool)}
        title="Select Tool"
        aria-label="Select Tool"
      >
        <MousePointer2 size={18} />
      </button>
      <button
        onClick={() => onSelect('pan')}
        className={toolButtonClass(activeTool === 'pan')}
        title="Pan Tool"
        aria-label="Pan Tool"
      >
        <Hand size={18} />
      </button>
      <button
        onClick={() => onSelect('text')}
        className={toolButtonClass(activeTool === 'text')}
        title="Add Text"
        aria-label="Add Text"
      >
        <Type size={18} />
      </button>
      <button
        onClick={() => onSelect('draw')}
        className={toolButtonClass(activeTool === 'draw')}
        title="Freehand Draw"
        aria-label="Freehand Draw"
      >
        <PenTool size={18} />
      </button>
      <button
        onClick={onOpenSignature}
        className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md transition-colors text-[var(--text-2)] hover:bg-[var(--surface-2)]"
        title="Add Signature"
        aria-label="Add Signature"
      >
        <Edit3 size={18} />
      </button>
      <button
        onClick={onPickImage}
        className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md transition-colors text-[var(--text-2)] hover:bg-[var(--surface-2)]"
        title="Add Image/Watermark"
        aria-label="Add Image/Watermark"
      >
        <ImageIcon size={18} />
      </button>
      <button
        onClick={() => onSelect('redact')}
        className={toolButtonClass(activeTool === 'redact')}
        title="Redact"
        aria-label="Redact"
      >
        <Square size={18} className="fill-current" />
      </button>
      <button
        onClick={() => onSelect('crop')}
        className={toolButtonClass(activeTool === 'crop', 'emerald')}
        title="Crop Page"
        aria-label="Crop Page"
      >
        <Crop size={18} />
      </button>
    </div>
  );
}
