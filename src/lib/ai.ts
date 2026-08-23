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
 *   1. tauri-plugin-store (desktop: user-configured via Settings UI)
 *   2. import.meta.env.VITE_GEMINI_API_KEY (web: build-time injected)
 * Returns null if neither is set.
 */
export async function resolveApiKey(): Promise<string | null> {
  if (apiKeyCache) return apiKeyCache;
  const fromStore = await getStoreValue<string>('geminiApiKey');
  if (fromStore && fromStore.trim()) {
    apiKeyCache = fromStore.trim();
    return apiKeyCache;
  }
  const fromEnv = import.meta.env.VITE_GEMINI_API_KEY;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) {
    apiKeyCache = fromEnv.trim();
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
      'or set VITE_GEMINI_API_KEY in your environment for web builds.'
    );
  }
  genAI = new GoogleGenAI({ apiKey: key });
  return genAI;
}

/**
 * @deprecated Prefer getGenAIAsync(). Kept for back-compat with code paths
 * that cannot be made async (e.g. synchronous React renderers). Falls back to
 * the build-time env var; throws if missing.
 */
export function getGenAI(): GoogleGenAI {
  if (genAI) return genAI;
  // Prefer the in-memory cache (set by resolveApiKey() or the Settings UI)
  // before falling back to the build-time env var. This lets users update
  // their key at runtime without a page reload.
  const key = apiKeyCache ?? import.meta.env.VITE_GEMINI_API_KEY;
  if (key && typeof key === 'string' && key.trim()) {
    genAI = new GoogleGenAI({ apiKey: key.trim() });
    return genAI;
  }
  throw new Error(
    'Gemini API key not configured. Open Settings to add your key, ' +
    'call resolveApiKey() first, or set VITE_GEMINI_API_KEY in your environment.'
  );
}

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
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
      
      // Don't retry on the last attempt
      if (attempt === maxAttempts) {
        break;
      }
      
      // Calculate exponential backoff delay
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      
      // Add some jitter to prevent thundering herd
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

  // Split text into overlapping chunks
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.substring(start, end));
    if (end === text.length) break;
    start = end - OVERLAP;
  }

  // Single chunk - summarize directly
  if (chunks.length === 1) {
    return withRetry(async () => {
      const response = await getGenAI().models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Please provide a concise summary of the following content. Focus on the main topics, key points, and important details:\n\n${chunks[0]}`,
      });
      return response.text || 'Unable to generate summary';
    });
  }

  // Multiple chunks - summarize each then combine
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

  // Combine chunk summaries into a final summary
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
    // Create a numbered list of texts to translate
    const batchText = texts.map((text, i) => `[${i + 1}] ${text}`).join('\n\n');
    
    const model = getGenAI().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Translate the following numbered text items to ${targetLang}. Return ONLY the translations, one per line, in the same order as the input. Do not include the numbers or any additional text:\n\n${batchText}`,
    });
    
    const response = await model;
    const translatedText = response.text || '';
    
    // Split the response back into individual translations
    const translations = translatedText.split('\n').map((line: string) => {
      // Remove any leading numbers like "1. " or "[1] "
      return line.replace(/^\d+[.)]\s*/, '').replace(/^\[\d+\]\s*/, '').trim();
    }).filter((line: string) => line.length > 0);
    
    // If we got fewer translations than inputs, pad with originals
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
