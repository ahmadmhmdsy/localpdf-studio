/**
 * Production-safe logging utilities.
 * Only logs to console in development mode.
 */
export function logError(message: string, error?: unknown): void {
  if (import.meta.env.DEV) {
    console.error(message, error);
  }
}

export function logWarn(message: string, error?: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(message, error);
  }
}
