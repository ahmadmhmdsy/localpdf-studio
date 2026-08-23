import { describe, it, expect } from 'vitest';
import { pdfjsLib } from './pdfjs';

describe('pdfjs setup', () => {
  it('sets GlobalWorkerOptions.workerSrc to a non-empty string', () => {
    // pdfjs.ts runs at import time and sets workerSrc from the ?url import
    expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBeTruthy();
    expect(typeof pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('string');
  });

  it('re-exports the pdfjs namespace', () => {
    expect(pdfjsLib).toBeDefined();
    // pdfjs exposes version + GlobalWorkerOptions
    expect(pdfjsLib.GlobalWorkerOptions).toBeDefined();
  });
});