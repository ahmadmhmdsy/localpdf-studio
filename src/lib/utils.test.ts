import { describe, it, expect } from 'vitest';
import { cn, sanitizeFilename } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('handles array of classes', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });

  it('handles object notation', () => {
    expect(cn({ 'active': true, 'disabled': false })).toBe('active');
  });

  it('resolves tailwind conflicts', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('resolves tailwind conflicts with conditionals', () => {
    const shouldApply = true;
    expect(cn('p-4', shouldApply && 'p-8')).toBe('p-8');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('', false, null, undefined)).toBe('');
  });

  it('handles mixed types', () => {
    expect(cn('base', ['a', 'b'], { 'c': true, 'd': false }, null, undefined)).toBe('base a b c');
  });
});

describe('sanitizeFilename', () => {
  it('strips leading directory traversal on Unix', () => {
    expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd');
  });

  it('strips leading directory traversal on Windows', () => {
    expect(sanitizeFilename('..\\..\\Windows\\system32\\evil.exe')).toBe('evil.exe');
  });

  it('preserves normal filenames', () => {
    expect(sanitizeFilename('report.pdf')).toBe('report.pdf');
  });

  it('preserves filenames with spaces', () => {
    expect(sanitizeFilename('my report (2).pdf')).toBe('my report (2).pdf');
  });

  it('removes null bytes', () => {
    expect(sanitizeFilename('file\x00.pdf')).toBe('file.pdf');
  });
});
