import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viteConfigSource = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

/** Comments explain why the channel is absent and must not satisfy or trip a guard. */
const viteConfigCode = viteConfigSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/**
 * The public web bundle must have no build-time key channel at all. Any
 * `define` or unprefixed `loadEnv` in the Vite config inlines a value into
 * JavaScript that every visitor downloads, so both are guarded here rather than
 * reviewed by hand.
 */
describe('web build key channel', () => {
  it('never mentions a Gemini API key', () => {
    expect(viteConfigCode).not.toMatch(/GEMINI_API_KEY/);
    expect(viteConfigCode).not.toMatch(/API_KEY/);
  });

  it('has no define block that can inline a value into the bundle', () => {
    expect(viteConfigCode).not.toMatch(/\bdefine\s*:/);
  });

  it('does not load unprefixed .env values into the build', () => {
    expect(viteConfigCode).not.toMatch(/loadEnv/);
  });

  it('keeps the environment prefix limited to client-safe variables', () => {
    expect(viteConfigSource).toMatch(/envPrefix:\s*\[['"]VITE_['"]/);
  });
});
