import { describe, it, expect } from 'vitest';
import { hexToRgb } from './color';

describe('hexToRgb', () => {
  it('parses 6-digit hex with # prefix', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 1, b: 0 });
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 1 });
  });

  it('parses 6-digit hex without # prefix', () => {
    expect(hexToRgb('ff0000')).toEqual({ r: 1, g: 0, b: 0 });
  });

  it('returns 0-1 float values, not 0-255 ints', () => {
    const result = hexToRgb('#808080');
    expect(result.r).toBeGreaterThan(0);
    expect(result.r).toBeLessThan(1);
    expect(result.r).toBeCloseTo(128 / 255);
  });

  it('handles black and white', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#ffffff')).toEqual({ r: 1, g: 1, b: 1 });
  });
});