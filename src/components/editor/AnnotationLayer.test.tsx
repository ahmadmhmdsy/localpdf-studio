import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnnotationLayer from './AnnotationLayer';
import * as EditorContextModule from '../../contexts/EditorContext';

vi.mock('./annotations/TextAnnotationItem', () => ({
  default: () => <div data-testid="text-annotation" />,
}));
vi.mock('./annotations/ImageAnnotationItem', () => ({
  default: () => <div data-testid="image-annotation" />,
}));
vi.mock('./annotations/RedactAnnotationItem', () => ({
  default: () => <div data-testid="redact-annotation" />,
}));
vi.mock('./annotations/CropAnnotationItem', () => ({
  default: () => <div data-testid="crop-annotation" />,
}));
vi.mock('./annotations/DrawAnnotationItem', () => ({
  default: () => <div data-testid="draw-annotation" />,
}));

describe('AnnotationLayer redaction quarantine', () => {
  const addAnnotation = vi.fn();
  const setSelectedAnnotationId = vi.fn();
  const setActiveTool = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(EditorContextModule, 'useEditor').mockReturnValue({
      pages: [{ id: 'page-0', originalIndex: 0, rotation: 0 }],
      currentPage: 1,
      annotations: [
        { id: 'text-1', pageId: 'page-0', type: 'text', text: 'hello', x: 0.2, y: 0.2, fontSize: 12, color: 'black' },
        { id: 'redact-1', pageId: 'page-0', type: 'redact', x: 0.5, y: 0.5, width: 0.2, height: 0.05, color: 'black' },
      ],
      activeTool: 'select',
      addAnnotation,
      setSelectedAnnotationId,
      setActiveTool,
    } as any);
  });

  it('does not render a legacy redaction record', () => {
    render(<AnnotationLayer />);
    expect(screen.getByTestId('text-annotation')).toBeInTheDocument();
    expect(screen.queryByTestId('redact-annotation')).not.toBeInTheDocument();
  });

  it('does not create a redaction record when legacy activeTool is redact', () => {
    vi.spyOn(EditorContextModule, 'useEditor').mockReturnValue({
      pages: [{ id: 'page-0', originalIndex: 0, rotation: 0 }],
      currentPage: 1,
      annotations: [],
      activeTool: 'redact',
      addAnnotation,
      setSelectedAnnotationId,
      setActiveTool,
    } as any);

    const { container } = render(<AnnotationLayer />);
    const layer = container.firstElementChild as HTMLElement;
    fireEvent.pointerDown(layer, {
      clientX: 10,
      clientY: 10,
    });

    expect(addAnnotation).not.toHaveBeenCalled();
  });
});
