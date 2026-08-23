import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeFilename(name: string): string {
  let cleaned = name.replace(/^.*[/\\]/, '');
  cleaned = cleaned.split('').filter(c => c >= ' ').join('');
  return cleaned;
}
