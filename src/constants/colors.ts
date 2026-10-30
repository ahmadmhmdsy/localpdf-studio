export const ANNOTATION_COLORS = [
  { value: '#000000', labelKey: 'editor.color.black' },
  { value: '#EF4444', labelKey: 'editor.color.red' },
  { value: '#3B82F6', labelKey: 'editor.color.blue' },
  { value: '#10B981', labelKey: 'editor.color.green' },
  { value: '#F59E0B', labelKey: 'editor.color.yellow' },
  { value: '#6B7280', labelKey: 'editor.color.gray' },
] as const;

export const REDACT_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#FFFFFF', label: 'White' },
  { value: '#EF4444', label: 'Red' },
] as const;

export type AnnotationColor = typeof ANNOTATION_COLORS[number]['value'];
export type RedactColor = typeof REDACT_COLORS[number]['value'];
