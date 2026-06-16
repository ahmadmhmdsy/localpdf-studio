import { describe, it, expect } from 'vitest';
import { parsePageRanges, InvalidPageRangeError } from './pdf';

describe('parsePageRanges', () => {
  it('should parse single pages correctly', () => {
    expect(parsePageRanges('1, 3, 5', 10)).toEqual([0, 2, 4]);
  });

  it('should parse ranges correctly', () => {
    expect(parsePageRanges('1-3', 10)).toEqual([0, 1, 2]);
  });

  it('should handle mixed single pages and ranges', () => {
    expect(parsePageRanges('1, 3-5, 8', 10)).toEqual([0, 2, 3, 4, 7]);
  });

  it('should throw on out of bounds pages', () => {
    expect(() => parsePageRanges('1, 15, 20-25', 10)).toThrow(InvalidPageRangeError);
  });

  it('should handle overlapping ranges and deduplicate', () => {
    expect(parsePageRanges('1-5, 3-7', 10)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('should throw on non-numeric input', () => {
    expect(() => parsePageRanges('abc, 1-xyz, 2', 10)).toThrow(InvalidPageRangeError);
  });

  it('should throw on completely invalid input', () => {
    expect(() => parsePageRanges('invalid', 10)).toThrow(InvalidPageRangeError);
  });

  it('should throw on empty string', () => {
    expect(() => parsePageRanges('', 10)).toThrow(InvalidPageRangeError);
  });

  it('should throw when start > end in a range', () => {
    expect(() => parsePageRanges('5-3', 10)).toThrow(/greater than end/);
  });

  it('should throw when document has no pages', () => {
    expect(() => parsePageRanges('1', 0)).toThrow(/no pages/);
  });
});
