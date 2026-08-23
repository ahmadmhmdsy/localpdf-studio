export const ANNOTATION_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#EF4444', label: 'Red' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Yellow' },
  { value: '#6B7280', label: 'Gray' },
] as const;

export const REDACT_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#FFFFFF', label: 'White' },
  { value: '#EF4444', label: 'Red' },
] as const;

export type AnnotationColor = typeof ANNOTATION_COLORS[number]['value'];
export type RedactColor = typeof REDACT_COLORS[number]['value'];
