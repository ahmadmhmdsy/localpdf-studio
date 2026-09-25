import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const viteConfigSource = readFileSync(resolve(projectRoot, 'vite.config.ts'), 'utf8');

/** Comments explain why the channel is absent and must not satisfy or trip a guard. */
const viteConfigCode = viteConfigSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/**
 * Every value with one of these prefixes is inlined into the bundle that every
 * visitor downloads, so the set is asserted exactly rather than by its first entry:
 * the old check only proved the list *started* with 'VITE_', which a second
 * 'GEMINI_' or 'SECRET_' prefix would have satisfied.
 *
 * VITE_ is Vite's client prefix and carries no value in this project. TAURI_ exists
 * only because `tauri dev` injects TAURI_DEV for the dev-server host check.
 */
const ALLOWED_ENV_PREFIXES = ['VITE_', 'TAURI_'];

const readEnvPrefixes = (source: string): string[] => {
  const match = /envPrefix:\s*\[([^\]]*)\]/.exec(source);
  if (match === null) return [];
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]);
};

/**
 * The client-exposed names src is allowed to read. All three are non-secret build
 * metadata: `DEV` is Vite's own build-mode flag, replaced with a boolean;
 * `VITE_APP_URL` is the self-referential link base; `VITE_DEV` is a build flag. A
 * key-shaped name belongs in the Tauri store, never here.
 */
const ALLOWED_CLIENT_ENV_NAMES = new Set(['DEV', 'VITE_APP_URL', 'VITE_DEV']);

/** Matches dot and bracket access, because either one gets inlined. */
const findClientEnvReferences = (source: string): string[] =>
  [
    ...source.matchAll(/import\.meta\.env(?:\.([A-Z0-9_]+)|\[['"]?([A-Z0-9_]+)['"]?\])/g),
  ].map((match) => match[1] ?? match[2])
    .filter((name): name is string => name !== undefined);

const collectSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    if (!/\.(ts|tsx|css)$/.test(entry.name)) return [];
    if (/\.test\.(ts|tsx)$/.test(entry.name)) return [];
    if (relative(projectRoot, fullPath).split(sep)[1] === 'tests') return [];
    return [fullPath];
  });

const srcFiles = collectSourceFiles(resolve(projectRoot, 'src'));

/**
 * The public web bundle must have no build-time key channel at all. Any `define` or
 * unprefixed `loadEnv` in the Vite config inlines a value into JavaScript that every
 * visitor downloads, and any `import.meta.env.VITE_*` read in src is replaced with the
 * literal at build time, so all three channels are guarded here rather than reviewed
 * by hand.
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

  it('exposes exactly the reviewed set of client-safe env prefixes', () => {
    expect(readEnvPrefixes(viteConfigSource)).toEqual(ALLOWED_ENV_PREFIXES);
  });

  it('never inlines a secret-shaped env prefix', () => {
    for (const prefix of readEnvPrefixes(viteConfigSource)) {
      expect(prefix, `${prefix} would inline a secret into the public bundle`).not.toMatch(
        /KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL/i,
      );
    }
  });

  it('rejects a prefix list that grew a new entry', () => {
    // Proves the exact-set assertion above is not satisfied by a longer list.
    const widened = viteConfigSource.replace(
      /envPrefix:\s*\[[^\]]*\]/,
      "envPrefix: ['VITE_', 'TAURI_', 'GEMINI_']",
    );
    expect(readEnvPrefixes(widened)).not.toEqual(ALLOWED_ENV_PREFIXES);
  });
});

describe('client-exposed build-time variables in src', () => {
  it('reads no env name outside the documented allowlist', () => {
    const unexpected = srcFiles.flatMap((file) =>
      findClientEnvReferences(readFileSync(file, 'utf8'))
        .filter((name) => !ALLOWED_CLIENT_ENV_NAMES.has(name))
        .map((name) => `${relative(projectRoot, file).split(sep).join('/')}: import.meta.env.${name}`),
    );

    expect(unexpected).toEqual([]);
  });

  it('scans a non-empty set of source files', () => {
    expect(srcFiles.length).toBeGreaterThan(50);
  });

  it('detects a reintroduced key reference in either access form', () => {
    // Guard-of-the-guard: the assertion above cannot quietly stop matching.
    expect(findClientEnvReferences('const key = import.meta.env.VITE_GEMINI_API_KEY;')).toEqual([
      'VITE_GEMINI_API_KEY',
    ]);
    expect(findClientEnvReferences("const k = import.meta.env['VITE_SECRET_TOKEN'];")).toEqual([
      'VITE_SECRET_TOKEN',
    ]);
    expect(findClientEnvReferences('const u = import.meta.env.VITE_APP_URL;')).toEqual([
      'VITE_APP_URL',
    ]);
    expect(findClientEnvReferences('if (import.meta.env.DEV) {}')).toEqual(['DEV']);
  });
});
