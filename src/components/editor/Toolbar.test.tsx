import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toolbar from './Toolbar';
import * as DocumentStoreModule from '../../store/documentStore';
import * as ToolsStoreModule from '../../store/toolsStore';
import * as AnnotationsStoreModule from '../../store/annotationsStore';
import * as ToastContextModule from '../../contexts/ToastContext';

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      copyPages: vi.fn().mockResolvedValue([]),
      embedFont: vi.fn().mockResolvedValue({}),
      addPage: vi.fn(),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }),
  },
  degrees: vi.fn((v) => v),
  rgb: vi.fn(),
  StandardFonts: { Helvetica: 'Helvetica' },
}));

const mockFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });

describe('Toolbar', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();

    vi.spyOn(ToolsStoreModule, 'useToolsStore').mockReturnValue({
      zoom: 1,
      setZoom: vi.fn(),
      activeTool: 'select',
      setActiveTool: vi.fn(),
      currentPage: 1,
      darkMode: false,
      toggleDarkMode: vi.fn(),
      setCurrentPage: vi.fn(),
    } as any);

    vi.spyOn(DocumentStoreModule, 'useDocumentStore').mockReturnValue({
      file: mockFile,
      clearFile: vi.fn(),
      pdfLibDoc: {},
      pages: [{ id: 'page-0', originalIndex: 0, rotation: 0 }],
      setPages: vi.fn(),
    } as any);

    vi.spyOn(AnnotationsStoreModule, 'useAnnotationsStore').mockReturnValue({
      annotations: [],
      addAnnotation: vi.fn(),
      undo: vi.fn(() => null),
      redo: vi.fn(() => null),
    } as any);

    vi.spyOn(ToastContextModule, 'useToast').mockReturnValue({
      showToast: vi.fn(),
      toasts: [],
      dismissToast: vi.fn(),
    } as any);
  });

  it('renders null when no file is loaded', () => {
    vi.spyOn(DocumentStoreModule, 'useDocumentStore').mockReturnValue({
      file: null,
      clearFile: vi.fn(),
      pdfLibDoc: null,
      pages: [],
      setPages: vi.fn(),
    } as any);
    const { container } = render(<Toolbar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders toolbar when file is loaded', () => {
    render(<Toolbar />);
    expect(screen.getByLabelText('Select Tool')).toBeInTheDocument();
    expect(screen.getByLabelText('Pan Tool')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Text')).toBeInTheDocument();
    expect(screen.getByLabelText('Freehand Draw')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Signature')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Image/Watermark')).toBeInTheDocument();
    expect(screen.getByLabelText('Redact')).toBeInTheDocument();
    expect(screen.getByLabelText('Crop Page')).toBeInTheDocument();
  });

  it('renders zoom controls', () => {
    render(<Toolbar />);
    expect(screen.getByLabelText('Zoom Out')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom In')).toBeInTheDocument();
    expect(screen.getByLabelText('Fit to Page')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders undo/redo buttons', () => {
    render(<Toolbar />);
    expect(screen.getByLabelText(/Undo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Redo/)).toBeInTheDocument();
  });

  it('renders dark mode toggle', () => {
    render(<Toolbar />);
    expect(screen.getByLabelText('Dark Mode')).toBeInTheDocument();
  });

  it('displays filename', () => {
    render(<Toolbar />);
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('renders export buttons', () => {
    render(<Toolbar />);
    expect(screen.getByText('Export Page')).toBeInTheDocument();
    expect(screen.getByText('Export All')).toBeInTheDocument();
  });

  it('renders close file button', () => {
    render(<Toolbar />);
    expect(screen.getByLabelText('Close File')).toBeInTheDocument();
  });

  it('calls setActiveTool when tool button clicked', async () => {
    const setActiveTool = vi.fn();
    vi.spyOn(ToolsStoreModule, 'useToolsStore').mockReturnValue({
      zoom: 1, setZoom: vi.fn(), activeTool: 'select', setActiveTool,
      currentPage: 1, darkMode: false, toggleDarkMode: vi.fn(), setCurrentPage: vi.fn(),
    } as any);
    render(<Toolbar />);
    await user.click(screen.getByLabelText('Add Text'));
    expect(setActiveTool).toHaveBeenCalledWith('text');
  });

  it('calls setZoom when zoom buttons clicked', async () => {
    const setZoom = vi.fn();
    vi.spyOn(ToolsStoreModule, 'useToolsStore').mockReturnValue({
      zoom: 1, setZoom, activeTool: 'select', setActiveTool: vi.fn(),
      currentPage: 1, darkMode: false, toggleDarkMode: vi.fn(), setCurrentPage: vi.fn(),
    } as any);
    render(<Toolbar />);
    await user.click(screen.getByLabelText('Zoom In'));
    expect(setZoom).toHaveBeenCalledWith(1.25);
  });

  it('calls clearFile when close file button clicked', async () => {
    const clearFile = vi.fn();
    vi.spyOn(DocumentStoreModule, 'useDocumentStore').mockReturnValue({
      file: mockFile, clearFile, pdfLibDoc: {}, pages: [{ id: 'page-0', originalIndex: 0, rotation: 0 }], setPages: vi.fn(),
    } as any);
    render(<Toolbar />);
    await user.click(screen.getByLabelText('Close File'));
    expect(clearFile).toHaveBeenCalledTimes(1);
  });

  it('calls toggleDarkMode when dark mode button clicked', async () => {
    const toggleDarkMode = vi.fn();
    vi.spyOn(ToolsStoreModule, 'useToolsStore').mockReturnValue({
      zoom: 1, setZoom: vi.fn(), activeTool: 'select', setActiveTool: vi.fn(),
      currentPage: 1, darkMode: false, toggleDarkMode, setCurrentPage: vi.fn(),
    } as any);
    render(<Toolbar />);
    await user.click(screen.getByLabelText('Dark Mode'));
    expect(toggleDarkMode).toHaveBeenCalledTimes(1);
  });

  it('shows active state for selected tool', () => {
    vi.spyOn(ToolsStoreModule, 'useToolsStore').mockReturnValue({
      zoom: 1, setZoom: vi.fn(), activeTool: 'text', setActiveTool: vi.fn(),
      currentPage: 1, darkMode: false, toggleDarkMode: vi.fn(), setCurrentPage: vi.fn(),
    } as any);
    render(<Toolbar />);
    const textBtn = screen.getByLabelText('Add Text');
    expect(textBtn).toHaveClass('bg-red-50');
  });

  it('shows dark mode icon when dark mode is active', () => {
    vi.spyOn(ToolsStoreModule, 'useToolsStore').mockReturnValue({
      zoom: 1, setZoom: vi.fn(), activeTool: 'select', setActiveTool: vi.fn(),
      currentPage: 1, darkMode: true, toggleDarkMode: vi.fn(), setCurrentPage: vi.fn(),
    } as any);
    render(<Toolbar />);
    expect(screen.getByLabelText('Light Mode')).toBeInTheDocument();
  });
});
