export const ANNOTATION_COLORS = [
  { value: '#000000', label: 'Black', tailwind: 'bg-black' },
  { value: '#EF4444', label: 'Red', tailwind: 'bg-red-500' },
  { value: '#3B82F6', label: 'Blue', tailwind: 'bg-blue-500' },
  { value: '#10B981', label: 'Green', tailwind: 'bg-emerald-500' },
  { value: '#F59E0B', label: 'Yellow', tailwind: 'bg-amber-500' },
  { value: '#6B7280', label: 'Gray', tailwind: 'bg-gray-500' },
] as const;

export const REDACT_COLORS = [
  { value: '#000000', label: 'Black', tailwind: 'bg-black' },
  { value: '#FFFFFF', label: 'White', tailwind: 'bg-white' },
  { value: '#EF4444', label: 'Red', tailwind: 'bg-red-500' },
] as const;

export type AnnotationColor = typeof ANNOTATION_COLORS[number]['value'];
export type RedactColor = typeof REDACT_COLORS[number]['value'];
