import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnnotationLayer from './AnnotationLayer';
import { useDocumentStore, useToolsStore, useAnnotationsStore } from '../../store';

// Mock the granular store hooks
vi.mock('../../store', () => ({
  useDocumentStore: vi.fn(),
  useToolsStore: vi.fn(),
  useAnnotationsStore: vi.fn(),
}));

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
    vi.mocked(useDocumentStore).mockImplementation((selector: (state: any) => unknown) => selector({
      pages: [{ id: 'page-0', originalIndex: 0, rotation: 0 }],
    }));
    vi.mocked(useToolsStore).mockImplementation((selector: (state: any) => unknown) => selector({
      currentPage: 1,
      activeTool: 'select',
      setActiveTool,
    }));
    vi.mocked(useAnnotationsStore).mockImplementation((selector: (state: any) => unknown) => selector({
      annotations: [
        { id: 'text-1', pageId: 'page-0', type: 'text', text: 'hello', x: 0.2, y: 0.2, fontSize: 12, color: 'black' },
        { id: 'redact-1', pageId: 'page-0', type: 'redact', x: 0.5, y: 0.5, width: 0.2, height: 0.05, color: 'black' },
      ],
      addAnnotation,
      setSelectedAnnotationId,
    }));
  });

  it('does not render a legacy redaction record', () => {
    render(<AnnotationLayer />);
    expect(screen.getByTestId('text-annotation')).toBeInTheDocument();
    expect(screen.queryByTestId('redact-annotation')).not.toBeInTheDocument();
  });

  it('does not create a redaction record when legacy activeTool is redact', () => {
    vi.mocked(useToolsStore).mockImplementation((selector: (state: any) => unknown) => selector({
      currentPage: 1,
      activeTool: 'redact',
      setActiveTool,
    }));
    vi.mocked(useAnnotationsStore).mockImplementation((selector: (state: any) => unknown) => selector({
      annotations: [],
      addAnnotation,
      setSelectedAnnotationId,
    }));

    const { container } = render(<AnnotationLayer />);
    const layer = container.firstElementChild as HTMLElement;
    fireEvent.pointerDown(layer, {
      clientX: 10,
      clientY: 10,
    });

    expect(addAnnotation).not.toHaveBeenCalled();
  });
});