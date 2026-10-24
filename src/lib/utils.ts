import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Windows reserved filenames (case-insensitive) */
const WINDOWS_RESERVED = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

export function sanitizeFilename(name: string): string {
  // Strip leading directory traversal (Unix and Windows)
  let cleaned = name.replace(/^.*[/\\]/, '');
  
  // Remove control characters (0x00-0x1F) and other dangerous chars
  cleaned = cleaned.split('').filter(c => c >= ' ').join('');
  
  // Remove leading dots (hidden files) and trim
  cleaned = cleaned.replace(/^\.+/, '').trim();
  
  // Handle Windows reserved filenames
  const baseName = cleaned.replace(/\.[^.]*$/, '').toUpperCase();
  if (WINDOWS_RESERVED.has(baseName)) {
    cleaned = '_' + cleaned;
  }
  
  // Collapse multiple dots (prevent "file....pdf" tricks)
  cleaned = cleaned.replace(/\.{2,}/g, '.');
  
  // Ensure the filename is not empty
  if (!cleaned) {
    cleaned = 'unnamed';
  }
  
  return cleaned;
}
