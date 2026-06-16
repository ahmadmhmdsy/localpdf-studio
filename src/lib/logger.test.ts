import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logError, logWarn } from './logger';

describe('logger', () => {
  let originalDev: boolean | undefined;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalDev = (import.meta.env as { DEV?: boolean }).DEV;
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (import.meta.env as { DEV?: boolean }).DEV = originalDev;
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('logs errors in development mode', () => {
    (import.meta.env as { DEV?: boolean }).DEV = true;
    logError('boom', new Error('x'));
    expect(errorSpy).toHaveBeenCalledWith('boom', expect.any(Error));
  });

  it('does not log errors in production', () => {
    (import.meta.env as { DEV?: boolean }).DEV = false;
    logError('boom', new Error('x'));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs warnings in development mode', () => {
    (import.meta.env as { DEV?: boolean }).DEV = true;
    logWarn('careful', new Error('x'));
    expect(warnSpy).toHaveBeenCalledWith('careful', expect.any(Error));
  });
});
