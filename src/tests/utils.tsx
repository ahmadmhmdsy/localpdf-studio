import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import ToastContainer from '../components/ui/ToastContainer';
import { EditorProvider } from '../contexts/EditorContext';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

/**
 * Custom render function that includes all necessary providers
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <EditorProvider>
        <BrowserRouter>
          <ToastContainer />
          {children}
        </BrowserRouter>
      </EditorProvider>
    </ToastProvider>
  );
}

/**
 * Renders a component with all necessary providers for testing
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Creates a mock File object from a File object (for testing consistency)
 */
export function createMockFile(
  file: File,
  overrides?: Partial<{ name: string; type: string; size: number }>
): File {
  return new File(
    [file],
    overrides?.name || file.name,
    { type: overrides?.type || file.type }
  );
}

/**
 * Simulates file upload via dropzone
 * Returns a function that can be used to trigger file drop
 */
export function mockFileDrop(files: File[]): () => { acceptedFiles: File[] } {
  return () => ({ acceptedFiles: files });
}

/**
 * Waits for processing state to complete
 */
export async function waitForProcessing(
  timeout: number = 100
): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

/**
 * Mocks file-saver saveAs function
 */
export function mockSaveAs(): typeof import('file-saver') {
  return {
    saveAs: vi.fn(),
  } as any;
}

/**
 * Creates a mock drag and drop event
 */
export function createDragEvent(
  type: string,
  files: File[]
): DragEvent {
  const event = new Event(type, { bubbles: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      files,
      getData: () => '',
      setData: () => {},
    },
  });
  return event;
}

/**
 * Mock implementation for URL methods
 */
export function setupUrlMocks() {
  const mockUrls: string[] = [];
  
  return {
    createObjectURL: vi.fn(() => {
      const url = `mock-url-${mockUrls.length}`;
      mockUrls.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn((url: string) => {
      const index = mockUrls.indexOf(url);
      if (index > -1) {
        mockUrls.splice(index, 1);
      }
    }),
    getCreatedUrls: () => [...mockUrls],
    clearUrls: () => { mockUrls.length = 0; },
  };
}

/**
 * Asserts that a toast notification was shown
 */
export function expectToastToHaveBeenShown(
  message: string,
  type?: 'success' | 'error' | 'warning' | 'info'
) {
  // This is a placeholder - actual implementation depends on how toast is tested
  // In practice, you'd spy on the toast context or check for toast element in DOM
}

/**
 * Mocks the fetch API for AI-related tests
 */
export function mockFetch(response: any) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(response),
    } as Response)
  );
}

/**
 * Resets all mocks between tests
 */
export function resetAllMocks() {
  vi.clearAllMocks();
}
