import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const sourceRoot = join(projectRoot, 'src');

const collectSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    if (!/\.(ts|tsx|css)$/.test(entry.name)) return [];
    if (/\.test\.(ts|tsx)$/.test(entry.name)) return [];
    if (relative(projectRoot, fullPath).split(sep)[1] === 'tests') return [];
    return [fullPath];
  });

/**
 * `--accent` stays legal for decoration (glows, orbs, borders, gradients, progress
 * rings) but must not be a *text* colour: the brand pink measures 2.36-2.68:1 on the
 * light surfaces, which fails WCAG 1.4.3. Text uses `--accent-text`, and white text
 * on an accent fill uses `--accent-solid`.
 */
const TEXT_USAGE_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: 'Tailwind text colour utility', pattern: /text-\[var\(--accent\)\]/ },
  {
    label: 'inline style colour',
    pattern: /(^|[;{\s])color:\s*['"`]var\(--accent\)['"`]/,
  },
  { label: 'CSS colour declaration', pattern: /(^|[;{])\s*color:\s*var\(--accent\)/ },
];

/**
 * Explicit, per-usage opt-out for a raw `--accent` text usage that is decorative
 * rather than semantic. Every entry must name the file, a snippet unique to the
 * line, and why the accent is not carrying meaning there.
 */
const DECORATIVE_TEXT_USAGE_ALLOWLIST: {
  file: string;
  snippet: string;
  reason: string;
}[] = [
  {
    file: 'src/pages/tools/MergePdf.tsx',
    snippet: '<FileIcon size={20} className="text-[var(--accent)]" />',
    reason: 'Decorative file-type glyph; the adjacent file name carries the meaning.',
  },
];

describe('accent token adoption', () => {
  it('does not use the raw accent token as a text colour', () => {
    const violations: string[] = [];

    for (const file of collectSourceFiles(sourceRoot)) {
      const relativePath = relative(projectRoot, file).split(sep).join('/');
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);

      lines.forEach((line, index) => {
        for (const { label, pattern } of TEXT_USAGE_PATTERNS) {
          if (!pattern.test(line)) continue;
          const allowed = DECORATIVE_TEXT_USAGE_ALLOWLIST.some(
            (entry) => entry.file === relativePath && line.includes(entry.snippet),
          );
          if (allowed) continue;
          violations.push(`${relativePath}:${index + 1} [${label}] ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('keeps every allowlist entry pointing at a real line', () => {
    const orphans = DECORATIVE_TEXT_USAGE_ALLOWLIST.filter((entry) => {
      const source = readFileSync(resolve(projectRoot, entry.file), 'utf8');
      return !source.includes(entry.snippet);
    });

    expect(orphans.map((entry) => `${entry.file}: ${entry.reason}`)).toEqual([]);
  });
});
