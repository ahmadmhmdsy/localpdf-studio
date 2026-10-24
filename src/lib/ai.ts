import { GoogleGenAI } from '@google/genai';
import { pdfjsLib } from './pdfjs';
import type { PDFPageProxy, TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';

interface TextItemWithString extends TextItem {
  str: string;
}

import { getStoreValue } from './native';

let genAI: GoogleGenAI | null = null;
let apiKeyCache: string | null = null;

/**
 * Resolve the Gemini API key from the most specific to least specific source:
 *   1. in-memory cache (populated by a previous resolve or the Settings UI)
 *   2. tauri-plugin-store (desktop: user-configured via Settings UI)
 *
 * There is deliberately no build-time environment fallback: a VITE_ variable is
 * inlined into the public browser bundle, so the web build never holds a key.
 * Returns null if neither source has a value.
 */
export async function resolveApiKey(): Promise<string | null> {
  if (apiKeyCache) return apiKeyCache;
  const fromStore = await getStoreValue<string>('geminiApiKey');
  if (fromStore && fromStore.trim()) {
    apiKeyCache = fromStore.trim();
    return apiKeyCache;
  }
  return null;
}

/** Reset the cached API key. Call after the user updates it in Settings. */
export function clearApiKeyCache(): void {
  apiKeyCache = null;
  genAI = null;
}

/** Synchronous accessor for tests and non-async call sites. */
export function getCachedApiKey(): string | null {
  return apiKeyCache;
}

/**
 * Async getter that resolves the API key and constructs the SDK client.
 * Throws a user-friendly error pointing to the Settings UI when missing.
 */
export async function getGenAIAsync(): Promise<GoogleGenAI> {
  if (genAI) return genAI;
  const key = await resolveApiKey();
  if (!key) {
    throw new Error(
      'Gemini API key not configured. Open Settings to add your key, ' +
      'or call resolveApiKey() first.'
    );
  }
  genAI = new GoogleGenAI({ apiKey: key });
  return genAI;
}

/**
 * @deprecated Prefer getGenAIAsync(). Kept for back-compat with code paths
 * that cannot be made async (e.g. synchronous React renderers). Uses only the
 * in-memory cache populated by resolveApiKey() or the Settings UI; throws when no
 * in-memory key is present. There is no build-time environment fallback.
 */
export function getGenAI(): GoogleGenAI {
  if (genAI) return genAI;
  // Only the in-memory cache is safe here: any build-time value would be
  // readable by anyone loading the published browser bundle.
  const key = apiKeyCache;
  if (key && key.trim()) {
    genAI = new GoogleGenAI({ apiKey: key.trim() });
    return genAI;
  }
  throw new Error(
    'Gemini API key not configured. Open Settings to add your key, ' +
    'or call resolveApiKey() first.'
  );
}

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
}

/**
 * Determine if an error is retryable.
 * - HTTP 429 (rate limit): retryable
 * - HTTP 5xx (server error): retryable
 * - HTTP 4xx (client error, except 429): NOT retryable
 * - Network errors (fetch throws): retryable
 * - Other errors: NOT retryable (fail fast)
 */
function isRetryableError(error: unknown): boolean {
  const status = (error as { status?: number; code?: number })?.status
    ?? (error as { status?: number; code?: number })?.code;

  if (typeof status === 'number') {
    if (status === 429) return true;
    if (status >= 500) return true;
    if (status >= 400 && status < 500) return false;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) return true;
  if ((error as { retryable?: boolean })?.retryable) return true;

  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        break;
      }

      if (!isRetryableError(error)) {
        console.warn('Non-retryable error encountered, failing fast:', lastError.message);
        break;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const jitteredDelay = delay + Math.random() * 500;

      console.warn(`API call failed (attempt ${attempt}/${maxAttempts}), retrying in ${jitteredDelay}ms...`, error);

      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError;
}

export async function extractPdfText(file: File, onProgress?: (page: number, total: number) => void): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let text = '';
  const totalPages = pdf.numPages;

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i) as PDFPageProxy;
    const content = await page.getTextContent() as TextContent;
    const pageText = content.items
      .filter((item): item is TextItemWithString => 'str' in item && typeof item.str === 'string')
      .map(item => item.str)
      .join(' ');
    text += `\n--- Page ${i} ---\n${pageText}`;
    onProgress?.(i, totalPages);
  }

  return text.trim();
}

export async function summarizePdf(text: string, onProgress?: (chunk: number, total: number) => void): Promise<string> {
  if (!text.trim()) {
    throw new Error('No text content found in PDF');
  }

  const CHUNK_SIZE = 25000;
  const OVERLAP = 500;

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.substring(start, end));
    if (end === text.length) break;
    start = end - OVERLAP;
  }

  if (chunks.length === 1) {
    return withRetry(async () => {
      const response = await getGenAI().models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Please provide a concise summary of the following content. Focus on the main topics, key points, and important details:\n\n${chunks[0]}`,
      });
      return response.text || 'Unable to generate summary';
    });
  }

  const chunkSummaries: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const summary = await withRetry(async () => {
      const response = await getGenAI().models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Summarize the following portion (part ${i + 1} of ${chunks.length}) of a document. Capture the key points:\n\n${chunks[i]}`,
      });
      return response.text || '';
    });
    chunkSummaries.push(summary);
    onProgress?.(i + 1, chunks.length);
  }

  const combinedText = chunkSummaries.join('\n\n');
  return withRetry(async () => {
    const response = await getGenAI().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Below are summaries of different sections of a document. Please combine them into a single coherent summary that captures the overall document content:\n\n${combinedText}`,
    });
    return response.text || combinedText;
  });
}

export interface TranslateResult {
  originalText: string;
  translatedText: string;
  x: number;
  y: number;
  fontSize: number;
  pageIndex: number;
}

export async function translatePdf(
  file: File,
  targetLang: string,
  onProgress?: (page: number, total: number) => void
): Promise<TranslateResult[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const results: TranslateResult[] = [];
  const totalPages = pdf.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum) as PDFPageProxy;
    const textContent = await page.getTextContent() as TextContent;

    const textItems = textContent.items.filter(
      (item): item is TextItemWithString => 'str' in item && typeof item.str === 'string' && item.str.trim().length > 0
    );

    if (textItems.length === 0) {
      onProgress?.(pageNum, totalPages);
      continue;
    }

    const textBatch = textItems.map(item => item.str);
    const translations = await translateTextBatch(textBatch, targetLang);

    for (let i = 0; i < textItems.length; i++) {
      const item = textItems[i];
      results.push({
        originalText: item.str,
        translatedText: translations[i] || item.str,
        x: item.transform[4],
        y: item.transform[5],
        fontSize: (item as unknown as { fontSize?: number }).fontSize || 12,
        pageIndex: pageNum - 1,
      });
    }

    onProgress?.(pageNum, totalPages);
  }

  return results;
}

async function translateTextBatch(texts: string[], targetLang: string): Promise<string[]> {
  return withRetry(async () => {
    const batchText = texts.map((text, i) => `[${i + 1}] ${text}`).join('\n\n');

    const model = getGenAI().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Translate the following numbered text items to ${targetLang}. Return ONLY the translations, one per line, in the same order as the input. Do not include the numbers or any additional text:\n\n${batchText}`,
    });

    const response = await model;
    const translatedText = response.text || '';

    const translations = translatedText.split('\n').map((line: string) => {
      return line.replace(/^\d+[.)]\s*/, '').replace(/^\[\d+\]\s*/, '').trim();
    }).filter((line: string) => line.length > 0);

    while (translations.length < texts.length) {
      translations.push(texts[translations.length]);
    }

    return translations.slice(0, texts.length);
  });
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'hi', name: 'Hindi' },
] as const;
