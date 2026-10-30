import { TextAnnotation, ImageAnnotation, DrawAnnotation } from '../../contexts/EditorContext';
import { useToolsStore, useAnnotationsStore, useDocumentStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { Trash2 } from 'lucide-react';
import { ANNOTATION_COLORS } from '../../constants/colors';
import { useI18n } from '../../i18n/useI18n';
import type { MessageKey } from '../../i18n';

const SETTINGS_HEADINGS: Record<string, MessageKey> = {
  text: 'editor.props.settings.text',
  image: 'editor.props.settings.image',
  crop: 'editor.props.settings.crop',
  draw: 'editor.props.settings.draw',
  redact: 'editor.props.settings.redact',
};

export default function PropertiesPanel() {
  const { t, toolName } = useI18n();
  const { activeTool, propertiesPanelVisible } = useToolsStore(
    useShallow((state) => ({
      activeTool: state.activeTool,
      propertiesPanelVisible: state.propertiesPanelVisible,
    }))
  );

  const { file, pages } = useDocumentStore(
    useShallow((state) => ({
      file: state.file,
      pages: state.pages,
    }))
  );

  const { annotations, selectedAnnotationId, updateAnnotation, deleteAnnotation } = useAnnotationsStore(
    useShallow((state) => ({
      annotations: state.annotations,
      selectedAnnotationId: state.selectedAnnotationId,
      updateAnnotation: state.updateAnnotation,
      deleteAnnotation: state.deleteAnnotation,
    }))
  );

  if (!file) return null;

  const selectedAnnotation = annotations.find(
    (annotation) => annotation.id === selectedAnnotationId && annotation.type !== 'redact',
  );

  const hasContent = activeTool !== 'redact' && (activeTool !== 'select' || selectedAnnotation);
  const showProperties = propertiesPanelVisible;

  if (!showProperties) return null;

  return (
    <div className="w-72 bg-[var(--surface)] border-s border-[var(--border)] flex flex-col h-full overflow-hidden shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <h3 className="font-semibold text-[var(--text)] text-sm uppercase tracking-wider">{t('editor.props.title')}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!hasContent ? (
          <div className="text-center text-[var(--text-3)] text-sm mt-10">
            <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            {t('editor.props.empty')}
          </div>
        ) : (
          <div className="space-y-6">
            <h4 className="font-medium text-[var(--text)] capitalize border-b border-[var(--border)] pb-2">
              {t(SETTINGS_HEADINGS[selectedAnnotation?.type ?? activeTool ?? ''] ?? 'editor.props.settings')}
            </h4>

            {(activeTool === 'text' || (selectedAnnotation && selectedAnnotation.type === 'text')) && (
              <div className="space-y-4">
                {activeTool === 'text' && !selectedAnnotation && (
                  <p className="text-xs text-[var(--text-3)] bg-[var(--surface-2)] p-3 rounded-lg border border-[var(--border)] mb-4">
                    {t('editor.props.textHint')}
                  </p>
                )}

                <div className={!selectedAnnotation ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-medium text-[var(--text-3)] mb-1">{t('editor.props.fontSize')}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="8"
                      max="72"
                      value={(selectedAnnotation as TextAnnotation)?.fontSize || 24}
                      onChange={(e) => selectedAnnotation && updateAnnotation(selectedAnnotation.id, { fontSize: parseInt(e.target.value) }, pages)}
                      className="flex-1 accent-red-600"
                    />
                    <span className="text-sm font-medium text-[var(--text-2)] w-6">{(selectedAnnotation as TextAnnotation)?.fontSize || 24}</span>
                  </div>
                </div>

                <div className={!selectedAnnotation ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-medium text-[var(--text-3)] mb-1">{t('editor.props.color')}</label>
                  <div className="flex gap-2">
                    {ANNOTATION_COLORS.map(({ value, labelKey }) => (
                      <button
                        key={value}
                        onClick={() => selectedAnnotation && updateAnnotation(selectedAnnotation.id, { color: value }, pages)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${(selectedAnnotation as TextAnnotation)?.color === value ? 'border-[var(--border)] scale-110' : 'border-[var(--border)] hover:border-[var(--border)]'}`}
                        style={{ backgroundColor: value }}
                        aria-label={t('editor.props.selectColor', { color: t(labelKey) })}
                      />
                    ))}
                  </div>
                </div>

                {selectedAnnotation && (
                  <div className="pt-4 mt-4 border-t border-[var(--border)]">
                    <button
                      onClick={() => deleteAnnotation(selectedAnnotation.id, pages)}
                      className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 size={16} />
                      {t('editor.props.deleteText')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {(activeTool === 'image' || (selectedAnnotation && selectedAnnotation.type === 'image')) && (
              <div className="space-y-4">
                {activeTool === 'image' && !selectedAnnotation && (
                  <p className="text-xs text-[var(--text-3)] bg-[var(--surface-2)] p-3 rounded-lg border border-[var(--border)] mb-4">
                    {t('editor.props.signHint', { tool: toolName('sign-pdf') })}
                  </p>
                )}

                <div className={!selectedAnnotation ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-medium text-[var(--text-3)] mb-1">{t('editor.props.opacity')}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={((selectedAnnotation as ImageAnnotation)?.opacity ?? 1) * 100}
                      onChange={(e) => selectedAnnotation && updateAnnotation(selectedAnnotation.id, { opacity: parseInt(e.target.value) / 100 }, pages)}
                      className="flex-1 accent-red-600"
                    />
                    <span className="text-sm font-medium text-[var(--text-2)] w-8">{Math.round(((selectedAnnotation as ImageAnnotation)?.opacity ?? 1) * 100)}%</span>
                  </div>
                </div>

                <div className={!selectedAnnotation ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-medium text-[var(--text-3)] mb-1">{t('editor.props.rotation')}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={(selectedAnnotation as ImageAnnotation)?.rotation || 0}
                      onChange={(e) => selectedAnnotation && updateAnnotation(selectedAnnotation.id, { rotation: parseInt(e.target.value) }, pages)}
                      className="flex-1 accent-red-600"
                    />
                    <span className="text-sm font-medium text-[var(--text-2)] w-8">{(selectedAnnotation as ImageAnnotation)?.rotation || 0}°</span>
                  </div>
                </div>

                {selectedAnnotation && (
                  <div className="pt-4 mt-4 border-t border-[var(--border)]">
                    <button
                      onClick={() => deleteAnnotation(selectedAnnotation.id, pages)}
                      className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 size={16} />
                      {t('editor.props.deleteImage')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {(activeTool === 'crop' || (selectedAnnotation && selectedAnnotation.type === 'crop')) && (
              <div className="space-y-4">
                {activeTool === 'crop' && !selectedAnnotation && (
                  <p className="text-xs text-[var(--text-3)] bg-[var(--surface-2)] p-3 rounded-lg border border-[var(--border)] mb-4">
                    {t('editor.props.cropHint')}
                  </p>
                )}

                {selectedAnnotation && (
                  <div className="pt-4 mt-4 border-t border-[var(--border)]">
                    <button
                      onClick={() => deleteAnnotation(selectedAnnotation.id, pages)}
                      className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 size={16} />
                      {t('editor.props.deleteCrop')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {(activeTool === 'draw' || (selectedAnnotation && selectedAnnotation.type === 'draw')) && (
              <div className="space-y-4">
                {activeTool === 'draw' && !selectedAnnotation && (
                  <p className="text-xs text-[var(--text-3)] bg-[var(--surface-2)] p-3 rounded-lg border border-[var(--border)] mb-4">
                    {t('editor.props.drawHint')}
                  </p>
                )}

                <div className={!selectedAnnotation ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-medium text-[var(--text-3)] mb-1">{t('editor.props.strokeWidth')}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={(selectedAnnotation as DrawAnnotation)?.strokeWidth || 2}
                      onChange={(e) => selectedAnnotation && updateAnnotation(selectedAnnotation.id, { strokeWidth: parseInt(e.target.value) }, pages)}
                      className="flex-1 accent-red-600"
                    />
                    <span className="text-sm font-medium text-[var(--text-2)] w-6">{(selectedAnnotation as DrawAnnotation)?.strokeWidth || 2}</span>
                  </div>
                </div>

                <div className={!selectedAnnotation ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-medium text-[var(--text-3)] mb-1">{t('editor.props.color')}</label>
                  <div className="flex gap-2">
                    {ANNOTATION_COLORS.map(({ value, labelKey }) => (
                      <button
                        key={value}
                        onClick={() => selectedAnnotation && updateAnnotation(selectedAnnotation.id, { color: value }, pages)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${(selectedAnnotation as DrawAnnotation)?.color === value ? 'border-[var(--border)] scale-110' : 'border-[var(--border)] hover:border-[var(--border)]'}`}
                        style={{ backgroundColor: value }}
                        aria-label={t('editor.props.selectColor', { color: t(labelKey) })}
                      />
                    ))}
                  </div>
                </div>

                {selectedAnnotation && (
                  <div className="pt-4 mt-4 border-t border-[var(--border)]">
                    <button
                      onClick={() => deleteAnnotation(selectedAnnotation.id, pages)}
                      className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 size={16} />
                      {t('editor.props.deleteDrawing')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
