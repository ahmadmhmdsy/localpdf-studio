import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PropertiesPanel from './PropertiesPanel';
import * as ToolsStoreModule from '../../store/toolsStore';
import * as DocumentStoreModule from '../../store/documentStore';
import * as AnnotationsStoreModule from '../../store/annotationsStore';

vi.mock('../../lib/pdfjs', () => ({
  pdfjsLib: {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: vi.fn(),
  }
}));

// Mock stores
const mockFile = new File([''], 'test.pdf', { type: 'application/pdf' });

describe('PropertiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no tool or annotation is selected', () => {
    vi.spyOn(ToolsStoreModule, 'useToolsStore').mockReturnValue({ activeTool: 'select', propertiesPanelVisible: true } as any);
    vi.spyOn(DocumentStoreModule, 'useDocumentStore').mockReturnValue({ file: mockFile } as any);
    vi.spyOn(AnnotationsStoreModule, 'useAnnotationsStore').mockReturnValue({
      annotations: [],
      selectedAnnotationId: null,
      updateAnnotation: vi.fn(),
      deleteAnnotation: vi.fn(),
    } as any);

    render(<PropertiesPanel />);

    expect(screen.getByText(/Select a tool or an element on the canvas to see its properties here/i)).toBeInTheDocument();
  });

  it('renders text settings when text tool is active', () => {
    vi.spyOn(ToolsStoreModule, 'useToolsStore').mockReturnValue({ activeTool: 'text', propertiesPanelVisible: true } as any);
    vi.spyOn(DocumentStoreModule, 'useDocumentStore').mockReturnValue({ file: mockFile } as any);
    vi.spyOn(AnnotationsStoreModule, 'useAnnotationsStore').mockReturnValue({ 
      annotations: [],
      selectedAnnotationId: null,
      updateAnnotation: vi.fn(),
      deleteAnnotation: vi.fn(),
    } as any);

    render(<PropertiesPanel />);
    
    expect(screen.getByText(/text Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Font Size/i)).toBeInTheDocument();
  });

  it('renders nothing when no file is loaded', () => {
    vi.spyOn(ToolsStoreModule, 'useToolsStore').mockReturnValue({ activeTool: 'select', propertiesPanelVisible: true } as any);
    vi.spyOn(DocumentStoreModule, 'useDocumentStore').mockReturnValue({ file: null } as any);
    vi.spyOn(AnnotationsStoreModule, 'useAnnotationsStore').mockReturnValue({ 
      annotations: [],
      selectedAnnotationId: null,
    } as any);

    const { container } = render(<PropertiesPanel />);
    expect(container.firstChild).toBeNull();
  });
});
