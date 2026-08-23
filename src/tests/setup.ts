import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import { useToastStore } from '../store/toastStore';

// Mock idb-keyval before any imports
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
}));

// Mock DOMMatrix for pdfjs-dist (must be a constructor, not arrow function)
class MockDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  is2D = true;
  m11 = 1; m12 = 0; m13 = 0; m14 = 0;
  m21 = 0; m22 = 1; m23 = 0; m24 = 0;
  m31 = 0; m32 = 0; m33 = 1; m34 = 0;
  m41 = 0; m42 = 0; m43 = 0; m44 = 1;

  multiply() { return new MockDOMMatrix(); }
  multiplySelf() { return this; }
  preMultiplySelf() { return this; }
  translate() { return new MockDOMMatrix(); }
  scale() { return new MockDOMMatrix(); }
  scaleFromSelf() { return new MockDOMMatrix(); }
  rotate() { return new MockDOMMatrix(); }
  rotateFromSelf() { return new MockDOMMatrix(); }
  rotateAxisAngle() { return new MockDOMMatrix(); }
  rotateAxisAngleFromSelf() { return new MockDOMMatrix(); }
  skewX() { return new MockDOMMatrix(); }
  skewY() { return new MockDOMMatrix(); }
  flipX() { return new MockDOMMatrix(); }
  flipY() { return new MockDOMMatrix(); }
  inverse() { return new MockDOMMatrix(); }
  invertSelf() { return this; }
  toFloat64Array() { return new Float64Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  toJSON() { return { a:1,b:0,c:0,d:1,e:0,f:0 }; }

  static fromFloat64Array() { return new MockDOMMatrix(); }
  static fromString() { return new MockDOMMatrix(); }
}

global.DOMMatrix = MockDOMMatrix as any;

// Mock matchMedia
global.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Blob with additional methods
global.Blob = class MockBlob extends Blob {
  constructor(parts?: any, options?: any) {
    super(parts, options);
  }
  override bytes() { return Promise.resolve(new Uint8Array()); }
} as any;

// Mock canvas context
const mockCanvasContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createPattern: vi.fn(() => ({})),
  strokeText: vi.fn(),
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  font: '',
  textAlign: 'start',
  textBaseline: 'alphabetic',
};

global.HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext) as any;

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock pdfjs worker URL import (Vite ?url imports don't resolve in Node/JSDOM)
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: '/mock-pdf-worker-url',
}));

// Reset toast store between tests
beforeEach(() => {
  useToastStore.getState().reset();
});

afterEach(() => {
  useToastStore.getState().reset();
});

// Mock tesseract.js — the real lib spawns a Web Worker that loads WASM
// and tries to use `import.meta`, both of which crash under jsdom.
vi.mock('tesseract.js', () => {
  const mockWorker = {
    recognize: vi.fn().mockResolvedValue({
      data: { text: '', words: [], lines: [], paragraphs: [], blocks: [] },
    }),
    terminate: vi.fn().mockResolvedValue(undefined),
    setParameters: vi.fn().mockResolvedValue(undefined),
  };
  return {
    createWorker: vi.fn().mockResolvedValue(mockWorker),
    __esModule: true,
  };
});

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes('ReactDOM.render') ||
    message.includes('act(...)') ||
    message.includes('Warning:') ||
    message.includes('Error:') ||
    message.includes('Setting up fake worker failed') ||
    message.includes('Error loading thumbnails') ||
    message.includes('Error loading thumbnail') ||
    message.includes('Error merging PDFs') ||
    message.includes('Worker is not defined') ||
    message.includes('tesseract') ||
    message.includes('mammoth') ||
    message.includes('Cannot read properties of undefined (reading \'clear\')') ||
    message.includes('read property')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};
