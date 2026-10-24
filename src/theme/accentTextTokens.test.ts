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
 * The raw accent tokens stay legal for decoration (glows, orbs, borders, gradients,
 * progress rings) but must not be a *text* colour: the brand pink measures
 * 2.36-2.68:1 on the light surfaces, which fails WCAG 1.4.3. Text uses `--accent-text`,
 * and white text on an accent fill uses `--accent-solid`.
 *
 * `--accent-2` is listed because it is the success/status token and is used as a text
 * colour in the few places documented in the allowlist below. A token that is newly
 * used as text has to be added to this list, otherwise the guard can be walked around
 * by spelling a different raw token.
 */
const RAW_ACCENT_TOKENS = ['--accent', '--accent-2'];

/**
 * `var(--accent)`, `var( --accent )`, `var(--accent, red)` and `var(--accent-2)` all
 * resolve to the same raw token, so the matcher tolerates whitespace, a fallback
 * argument, and the numbered variants. The lookahead keeps `--accent-text` and
 * `--accent-solid` out of the `--accent` pattern.
 */
const tokenReference = (token: string) =>
  'var\\(\\s*' + token + '(?![\\w-])(?:\\s*,[^)]*)?\\s*\\)';

const TEXT_USAGE_PATTERNS: { label: string; pattern: RegExp }[] = RAW_ACCENT_TOKENS.flatMap(
  (token) => [
    {
      label: 'Tailwind text colour utility (' + token + ')',
      pattern: new RegExp('text-\\[' + tokenReference(token) + '\\]'),
    },
    {
      label: 'inline style colour (' + token + ')',
      // Tolerates a conditional expression, because that is how the step trackers
      // choose a colour: color: isDone ? 'var(--accent-2)' : 'var(--text-3)'.
      pattern: new RegExp('(^|[;{\\s])color:[^;{}\\n]*?' + tokenReference(token)),
    },
    {
      label: 'CSS colour declaration (' + token + ')',
      pattern: new RegExp('(^|[;{])\\s*color:[^;{}\\n]*?' + tokenReference(token)),
    },
  ],
);

/**
 * Explicit, per-usage opt-out for a raw accent text usage that is decorative or is a
 * recorded status-token limitation. Every entry must name the file, a snippet unique
 * to the line, and why the raw token is acceptable there.
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
  // The success accent is a status colour, not a text token. These usages are the
  // recorded G1 contrast limitation: #6ee0c7 measures 11.1-12.5:1 on the dark
  // surfaces, while #3ab89a measures only ~2.5:1 on the light ones. Closing that needs
  // a decision about the success hue rather than a token swap, so each usage is
  // pinned here instead of being left unguarded (docs/release/g1-verification.md
  // records the limitation).
  {
    file: 'src/components/tools/ProcessingState.tsx',
    snippet: "color: isActive ? 'var(--text-2)' : isDone ? 'var(--accent-2)' : 'var(--text-3)',",
    reason: 'Completed-step label on the success accent; recorded light-theme status-token limitation.',
  },
  {
    file: 'src/components/tools/StepTrack.tsx',
    snippet: "color: isActive ? 'var(--accent-text)' : isDone ? 'var(--accent-2)' : 'var(--text-3)',",
    reason: 'Completed-step label on the success accent; recorded light-theme status-token limitation.',
  },
  {
    file: 'src/components/tools/DownloadState.tsx',
    snippet: "style={{ width: '36px', height: '36px', color: 'var(--accent-2)', overflow: 'visible' }}",
    reason: 'Success check glyph; the title beside it carries the meaning.',
  },
  {
    file: 'src/components/ui/ToastContainer.tsx',
    snippet: "success: 'text-[var(--accent-2)]',",
    reason: 'Success toast icon; the message text beside it carries the meaning.',
  },
];

describe('accent token adoption', () => {
  it('does not use a raw accent token as a text colour', () => {
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
          violations.push(relativePath + ':' + (index + 1) + ' [' + label + '] ' + line.trim());
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('matches alternative spellings of the same raw token', () => {
    // Guard-of-the-guard: the scan above must not be satisfiable by reformatting.
    const caught = [
      "color: 'var(--accent)',",
      'color: var( --accent );',
      'color: var(--accent, red);',
      "color: isDone ? 'var(--accent-2)' : 'var(--text-3)',",
      'color: var(--accent-2);',
      'className="text-[var(--accent-2)]"',
      'className="text-[var( --accent )]"',
    ];

    for (const sample of caught) {
      expect(
        TEXT_USAGE_PATTERNS.some(({ pattern }) => pattern.test(sample)),
        'not matched: ' + sample,
      ).toBe(true);
    }

    const legal = [
      "color: 'var(--accent-text)',",
      'color: var(--accent-solid);',
      'background: var(--accent-2);',
      'background-color: var(--accent);',
      'borderColor: \'var(--accent-2)\',',
    ];

    for (const sample of legal) {
      expect(
        TEXT_USAGE_PATTERNS.some(({ pattern }) => pattern.test(sample)),
        'wrongly matched: ' + sample,
      ).toBe(false);
    }
  });

  it('keeps every allowlist entry pointing at a real line', () => {
    const orphans = DECORATIVE_TEXT_USAGE_ALLOWLIST.filter((entry) => {
      const source = readFileSync(resolve(projectRoot, entry.file), 'utf8');
      // The scan is line-based, so a multi-line snippet could never match and would
      // silently become a dead entry.
      return !source.split(/\r?\n/).some((line) => line.includes(entry.snippet));
    });

    expect(orphans.map((entry) => entry.file + ': ' + entry.reason)).toEqual([]);
  });

  it('does not allowlist a line the scan would never flag', () => {
    // Otherwise a stale entry makes the allowlist look documented while covering
    // nothing, and the next raw usage on that line slips through.
    const ineffective = DECORATIVE_TEXT_USAGE_ALLOWLIST.filter((entry) => {
      const source = readFileSync(resolve(projectRoot, entry.file), 'utf8');
      return !source
        .split(/\r?\n/)
        .some((line) => line.includes(entry.snippet) && TEXT_USAGE_PATTERNS.some(({ pattern }) => pattern.test(line)));
    });

    expect(ineffective.map((entry) => entry.file + ': ' + entry.snippet)).toEqual([]);
  });
});
