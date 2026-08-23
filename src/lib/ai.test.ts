import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from './ai';

const { mockGenerateContent, MockGenAI } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();
  class MockGenAI {
    opts: unknown;
    constructor(opts: unknown) {
      this.opts = opts;
    }
    models = { generateContent: mockGenerateContent };
  }
  return { mockGenerateContent, MockGenAI };
});

vi.mock('./pdfjs', () => ({
  pdfjsLib: {
    getDocument: vi.fn(),
    GlobalWorkerOptions: { workerSrc: '' },
  },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: MockGenAI,
}));

describe('withRetry', () => {
  it('returns result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after max attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, { maxAttempts: 2, baseDelay: 10 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error received', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('error 1'))
      .mockRejectedValueOnce(new Error('error 2'));
    await expect(withRetry(fn, { maxAttempts: 2, baseDelay: 10 })).rejects.toThrow('error 2');
  });

  it('handles non-Error rejections', async () => {
    const fn = vi.fn().mockRejectedValue('string error');
    await expect(withRetry(fn, { maxAttempts: 1, baseDelay: 10 })).rejects.toThrow('string error');
  });
});

describe('extractPdfText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts text from single page PDF', async () => {
    const { extractPdfText } = await import('./ai');
    const { pdfjsLib } = await import('./pdfjs');
    const mockPage = {
      getTextContent: () => Promise.resolve({ items: [{ str: 'Hello World' }] }),
    };
    const mockPdf = { numPages: 1, getPage: () => Promise.resolve(mockPage) };
    (pdfjsLib.getDocument as any).mockReturnValue({ promise: Promise.resolve(mockPdf) });

    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const text = await extractPdfText(file);
    expect(text).toContain('Hello World');
    expect(text).toContain('Page 1');
  });

  it('extracts text from multi-page PDF', async () => {
    const { extractPdfText } = await import('./ai');
    const { pdfjsLib } = await import('./pdfjs');
    const mockPage1 = { getTextContent: () => Promise.resolve({ items: [{ str: 'Page 1 content' }] }) };
    const mockPage2 = { getTextContent: () => Promise.resolve({ items: [{ str: 'Page 2 content' }] }) };
    const mockPdf = { numPages: 2, getPage: (n: number) => Promise.resolve(n === 1 ? mockPage1 : mockPage2) };
    (pdfjsLib.getDocument as any).mockReturnValue({ promise: Promise.resolve(mockPdf) });

    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const text = await extractPdfText(file);
    expect(text).toContain('Page 1 content');
    expect(text).toContain('Page 2 content');
  });

  it('calls onProgress callback', async () => {
    const { extractPdfText } = await import('./ai');
    const { pdfjsLib } = await import('./pdfjs');
    const mockPage = { getTextContent: () => Promise.resolve({ items: [{ str: 'text' }] }) };
    const mockPdf = { numPages: 3, getPage: () => Promise.resolve(mockPage) };
    (pdfjsLib.getDocument as any).mockReturnValue({ promise: Promise.resolve(mockPdf) });

    const progress: number[] = [];
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    await extractPdfText(file, (page, total) => { progress.push(page); });
    expect(progress).toEqual([1, 2, 3]);
  });
});

describe('summarizePdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('throws error for empty text', async () => {
    const { summarizePdf } = await import('./ai');
    await expect(summarizePdf('')).rejects.toThrow('No text content found');
    await expect(summarizePdf('   ')).rejects.toThrow('No text content found');
  });

  it('calls Gemini once for short text and returns the response text', async () => {
    const { summarizePdf } = await import('./ai');
    mockGenerateContent.mockResolvedValueOnce({ text: 'A short summary.' });
    const out = await summarizePdf('Some short content to summarize.');
    expect(out).toBe('A short summary.');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('falls back to a placeholder when the model returns no text', async () => {
    const { summarizePdf } = await import('./ai');
    mockGenerateContent.mockResolvedValueOnce({ text: '' });
    const out = await summarizePdf('Anything will do.');
    expect(typeof out).toBe('string');
  });

  it('chunks long text into multiple parts and reports progress', async () => {
    const { summarizePdf } = await import('./ai');
    mockGenerateContent
      .mockResolvedValueOnce({ text: 'chunk summary 1' })
      .mockResolvedValueOnce({ text: 'chunk summary 2' })
      .mockResolvedValueOnce({ text: 'chunk summary 3' })
      .mockResolvedValueOnce({ text: 'final combined summary' });
    const long = 'a'.repeat(50000);
    const progress: number[] = [];
    const out = await summarizePdf(long, (i, total) => progress.push(i));
    expect(typeof out).toBe('string');
    expect(progress.length).toBeGreaterThan(0);
  });
});

describe('translatePdf and language list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('exposes a non-empty SUPPORTED_LANGUAGES list', async () => {
    const { SUPPORTED_LANGUAGES } = await import('./ai');
    expect(Array.isArray(SUPPORTED_LANGUAGES)).toBe(true);
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(0);
    expect(SUPPORTED_LANGUAGES[0]).toHaveProperty('code');
    expect(SUPPORTED_LANGUAGES[0]).toHaveProperty('name');
  });

  it('returns an empty list when a PDF has no extractable text', async () => {
    const { translatePdf } = await import('./ai');
    const { pdfjsLib } = await import('./pdfjs');
    const mockPdf = {
      numPages: 2,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({ items: [] }),
      }),
    };
    (pdfjsLib.getDocument as any).mockReturnValue({ promise: Promise.resolve(mockPdf) });

    const file = new File(['dummy'], 'a.pdf', { type: 'application/pdf' });
    const out = await translatePdf(file, 'es');
    expect(Array.isArray(out)).toBe(true);
    expect(out).toHaveLength(0);
  });

  it('extracts one TranslateResult per text item with a fallback translation', async () => {
    const { translatePdf } = await import('./ai');
    const { pdfjsLib } = await import('./pdfjs');
    const mockPdf = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            { str: 'Hello', transform: [0, 0, 0, 0, 10, 20] },
            { str: 'World', transform: [0, 0, 0, 0, 30, 20] },
          ],
        }),
      }),
    };
    (pdfjsLib.getDocument as any).mockReturnValue({ promise: Promise.resolve(mockPdf) });
    mockGenerateContent.mockResolvedValueOnce({ text: 'Hola\nMundo' });

    const file = new File(['dummy'], 'a.pdf', { type: 'application/pdf' });
    const out = await translatePdf(file, 'es');
    expect(out).toHaveLength(2);
    expect(out[0].originalText).toBe('Hello');
    expect(typeof out[0].translatedText).toBe('string');
    expect(out[0].pageIndex).toBe(0);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// API key resolution (Tauri store → env fallback)
// ─────────────────────────────────────────────────────────────────────────────

const mockGetStoreValue = vi.fn();

vi.mock('./native', () => ({
  getStoreValue: (...args: unknown[]) => mockGetStoreValue(...args),
  setStoreValue: vi.fn(),
  deleteStoreValue: vi.fn(),
  isTauri: () => false,
  API_KEY_CHANGED_EVENT: 'localpdf:api-key-changed',
  emitApiKeyChanged: vi.fn(),
}));

describe('resolveApiKey', () => {
  beforeEach(() => {
    mockGetStoreValue.mockReset();
    // Reset cache between tests
    vi.resetModules();
  });

  it('returns null when neither store nor env has a key', async () => {
    mockGetStoreValue.mockResolvedValueOnce(null);
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    vi.resetModules();
    const { resolveApiKey } = await import('./ai');
    expect(await resolveApiKey()).toBeNull();
    vi.unstubAllEnvs();
  });

  it('returns key from store when present', async () => {
    mockGetStoreValue.mockResolvedValueOnce('store-key-123');
    vi.stubEnv('VITE_GEMINI_API_KEY', 'env-key-456');
    vi.resetModules();
    const { resolveApiKey } = await import('./ai');
    expect(await resolveApiKey()).toBe('store-key-123');
    expect(mockGetStoreValue).toHaveBeenCalledWith('geminiApiKey');
    vi.unstubAllEnvs();
  });

  it('falls back to env when store returns null', async () => {
    mockGetStoreValue.mockResolvedValueOnce(null);
    vi.stubEnv('VITE_GEMINI_API_KEY', 'env-key-456');
    vi.resetModules();
    const { resolveApiKey } = await import('./ai');
    expect(await resolveApiKey()).toBe('env-key-456');
    vi.unstubAllEnvs();
  });

  it('trims whitespace from the resolved key', async () => {
    mockGetStoreValue.mockResolvedValueOnce('  spaced-key  ');
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    vi.resetModules();
    const { resolveApiKey } = await import('./ai');
    expect(await resolveApiKey()).toBe('spaced-key');
    vi.unstubAllEnvs();
  });
});

describe('clearApiKeyCache + getCachedApiKey', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetStoreValue.mockReset();
  });

  it('starts with no cached key', async () => {
    const { getCachedApiKey } = await import('./ai');
    expect(getCachedApiKey()).toBeNull();
  });

  it('clears the cache after resolveApiKey populated it', async () => {
    mockGetStoreValue.mockResolvedValueOnce('once-key');
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    vi.resetModules();
    const { resolveApiKey, clearApiKeyCache, getCachedApiKey } = await import('./ai');
    expect(await resolveApiKey()).toBe('once-key');
    expect(getCachedApiKey()).toBe('once-key');
    clearApiKeyCache();
    expect(getCachedApiKey()).toBeNull();
    vi.unstubAllEnvs();
  });
});

describe('sync getGenAI()', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetStoreValue.mockReset();
    mockGenerateContent.mockReset();
  });

  it('throws a helpful error when no key is configured', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    vi.resetModules();
    const { getGenAI } = await import('./ai');
    expect(() => getGenAI()).toThrow(/API key not configured/);
    vi.unstubAllEnvs();
  });

  it('uses env var when set', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'env-only');
    vi.resetModules();
    const { getGenAI } = await import('./ai');
    const client = getGenAI();
    expect(client).toBeInstanceOf(MockGenAI);
    expect((client as unknown as { opts: { apiKey: string } }).opts.apiKey).toBe('env-only');
    vi.unstubAllEnvs();
  });
});

describe('async getGenAIAsync()', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetStoreValue.mockReset();
  });

  it('throws when no key available anywhere', async () => {
    mockGetStoreValue.mockResolvedValueOnce(null);
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    vi.resetModules();
    const { getGenAIAsync } = await import('./ai');
    await expect(getGenAIAsync()).rejects.toThrow(/API key not configured/);
    vi.unstubAllEnvs();
  });

  it('uses the store key when available', async () => {
    mockGetStoreValue.mockResolvedValueOnce('store-key');
    vi.resetModules();
    const { getGenAIAsync } = await import('./ai');
    const client = await getGenAIAsync();
    expect(client).toBeInstanceOf(MockGenAI);
    expect((client as unknown as { opts: { apiKey: string } }).opts.apiKey).toBe('store-key');
  });
});
