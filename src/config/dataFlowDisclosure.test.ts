import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dataFlow = readFileSync(resolve(process.cwd(), 'docs/privacy/data-flow.md'), 'utf8');
const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

/**
 * The data-flow note is the beta's honest egress disclosure. These assertions keep
 * the three facts that are easy to "simplify" away and that a reader would
 * otherwise assume wrongly: that the shell loads no third-party asset at all, the
 * unbundled OCR assets, and the fact that the CSP still permits the Gemini origin.
 */
describe('data-flow disclosure', () => {
  it('ships no third-party font dependency in the app shell', () => {
    expect(indexHtml).not.toMatch(/fonts\.googleapis\.com/);
    expect(indexHtml).not.toMatch(/fonts\.gstatic\.com/);
    // No stylesheet or preconnect may point at any absolute origin, so a new
    // third-party asset cannot be reintroduced through a <link> alone.
    expect(indexHtml).not.toMatch(/<link[^>]+href="https?:\/\//i);
  });

  it('discloses that the app loads no third-party assets', () => {
    expect(dataFlow).toMatch(/no third-party assets/i);
    expect(dataFlow).not.toMatch(/fonts\.googleapis\.com/);
    expect(dataFlow).not.toMatch(/fonts\.gstatic\.com/);
  });

  it('discloses that OCR worker and language assets are not bundled', () => {
    expect(dataFlow).toMatch(/tesseract/i);
    expect(dataFlow).toMatch(/trained-?data|language data/i);
    expect(dataFlow).toMatch(/cdn/i);
    expect(dataFlow).toMatch(/local(ly)?\b/i);
  });

  it('discloses that the shipped CSP still allows the Gemini origin', () => {
    expect(indexHtml).toMatch(/connect-src[^;]*https:\/\/generativelanguage\.googleapis\.com/);
    expect(dataFlow).toMatch(/connect-src/);
    expect(dataFlow).toMatch(/generativelanguage\.googleapis\.com/);
  });
});
