import { MousePointer2, Hand, Type, PenTool, Image as ImageIcon, Edit3, Crop } from 'lucide-react';
import { useI18n } from '../../../i18n/useI18n';

interface ToolPickerProps {
  activeTool: string | null;
  onSelect: (tool: string | null) => void;
  onOpenSignature: () => void;
  onPickImage: () => void;
}

export function ToolPicker({ activeTool, onSelect, onOpenSignature, onPickImage }: ToolPickerProps) {
  const { t } = useI18n();
  const toolButtonClass = (isActive: boolean, color: 'red' | 'emerald' = 'red') =>
    `p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md transition-colors ${
      isActive
        ? color === 'red'
          ? 'bg-red-50 text-red-600'
          : 'bg-emerald-50 text-emerald-600'
        : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]'
    }`;

  return (
    <div className="flex items-center gap-2 border-e border-[var(--border)] pe-4">
      <button
        onClick={() => onSelect('select')}
        className={toolButtonClass(activeTool === 'select' || !activeTool)}
        title={t('editor.tool.select')}
        aria-label={t('editor.tool.select')}
      >
        <MousePointer2 size={18} />
      </button>
      <button
        onClick={() => onSelect('pan')}
        className={toolButtonClass(activeTool === 'pan')}
        title={t('editor.tool.pan')}
        aria-label={t('editor.tool.pan')}
      >
        <Hand size={18} />
      </button>
      <button
        onClick={() => onSelect('text')}
        className={toolButtonClass(activeTool === 'text')}
        title={t('editor.tool.text')}
        aria-label={t('editor.tool.text')}
      >
        <Type size={18} />
      </button>
      <button
        onClick={() => onSelect('draw')}
        className={toolButtonClass(activeTool === 'draw')}
        title={t('editor.tool.draw')}
        aria-label={t('editor.tool.draw')}
      >
        <PenTool size={18} />
      </button>
      <button
        onClick={onOpenSignature}
        className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md transition-colors text-[var(--text-2)] hover:bg-[var(--surface-2)]"
        title={t('editor.tool.signature')}
        aria-label={t('editor.tool.signature')}
      >
        <Edit3 size={18} />
      </button>
      <button
        onClick={onPickImage}
        className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md transition-colors text-[var(--text-2)] hover:bg-[var(--surface-2)]"
        title={t('editor.tool.image')}
        aria-label={t('editor.tool.image')}
      >
        <ImageIcon size={18} />
      </button>
      <button
        onClick={() => onSelect('crop')}
        className={toolButtonClass(activeTool === 'crop', 'emerald')}
        title={t('editor.tool.crop')}
        aria-label={t('editor.tool.crop')}
      >
        <Crop size={18} />
      </button>
    </div>
  );
}
