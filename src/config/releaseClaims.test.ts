import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOL_CATEGORIES } from '../constants/tools';
import { toolCopyEn } from '../i18n/locales/catalog.en';
import { TOOL_RELEASE_REGISTRY } from './featureRegistry';

type TauriConfig = {
  bundle: {
    shortDescription: string;
    longDescription: string;
  };
};

const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');
const tauriConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src-tauri/tauri.conf.json'), 'utf8'),
) as TauriConfig;
// Display copy now lives in the locale catalogs (B1.2); the claim guards read the
// English source locale, which is what the release surfaces render by default.
const blackoutDescription = toolCopyEn['blackout-pdf'].description;

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

/** Drops JSX/CSS tags so a source scan reads what a reader sees, not attributes. */
const stripMarkup = (source: string) => source.replace(/<[^>]*>/g, ' ');

/** Every shipped source file under src, for cross-file claim and anchor checks. */
const collectSrcSources = (dir = resolve(process.cwd(), 'src')): { path: string; source: string }[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return collectSrcSources(fullPath);
    if (!/\.(ts|tsx|css)$/.test(entry.name)) return [];
    return [
      {
        path: relative(process.cwd(), fullPath).split(sep).join('/'),
        source: readFileSync(fullPath, 'utf8'),
      },
    ];
  });

const srcSources = collectSrcSources();
const onboardingSource = readSource('src/components/onboarding/OnboardingTour.tsx');
const homeSource = readSource('src/pages/Home.tsx');
const homeBentoSource = readSource('src/pages/home/HomeBento.tsx');
const featureRegistrySource = readSource('src/config/featureRegistry.ts');
const designPreviewSource = readSource('design-preview/designs/01-hero.html');

const positiveRedactionClaims = [
  /redact(?:ion|ing)?(?![^.\n]{0,80}\b(?:not|never|unavailable|disabled)\b)[^.\n]{0,120}(?:securely|permanently|all locally|one click|\bavailable\b|\benabled\b|\bsupported\b)/i,
  /redact(?:ion|ing)?(?![^.\n]{0,80}\b(?:not|never|unavailable|disabled)\b)[^.\n]{0,100}\bsensitive\s+(?:data|text|content|pdfs?)\b/i,
  /(?:securely|permanently|offers?|provides?|supports?|includes?|enables?)[^.\n]{0,120}redact(?:ion|ing)?/i,
  /\b(?:blackouts?|redactions?)\b[^.\n]{0,100}(?:permanently|no longer extractable|un-extractable)/i,
];

const hasPositiveRedactionClaim = (source: string) =>
  source
    .split(/(?<=[.!?;])\s+|\n+|,\s*/)
    .some((sentence) => {
      if (/\b(?:not|never|unavailable|disabled|do not|don't)\b/i.test(sentence)) {
        return false;
      }
      return positiveRedactionClaims.some((claim) => claim.test(sentence));
    });

describe('release-facing redaction claims', () => {
  it('does not advertise editor redaction as an available capability', () => {
    expect(readme).not.toMatch(/full editor with[^.]*redaction tools/i);
    expect(readme).not.toMatch(/redact sensitive content/i);
    expect(tauriConfig.bundle.longDescription).not.toMatch(
      /sign,\s*redact,\s*compress/i,
    );
  });

  it('does not introduce positive redaction claims in release-facing surfaces', () => {
    const surfaces = {
      'README.md': readme,
      'Tauri longDescription': tauriConfig.bundle.longDescription,
      'OnboardingTour': onboardingSource,
      'Home': homeSource,
      'HomeBento': homeBentoSource,
      'featureRegistry': featureRegistrySource,
      'design preview': designPreviewSource,
    };

    for (const [name, source] of Object.entries(surfaces)) {
      expect(hasPositiveRedactionClaim(source), name).toBe(false);
    }

    expect(onboardingSource).not.toMatch(/redact|limitations before you choose/i);
    expect(homeSource).not.toMatch(/redact/i);
    expect(homeBentoSource).not.toMatch(/redact/i);
    expect(designPreviewSource).not.toMatch(/redact/i);
    expect(featureRegistrySource).toMatch(/editor has no redaction workflow/i);
    expect(featureRegistrySource).toMatch(/not a confidentiality boundary/i);
  });

  it('covers common positive redaction claim variants', () => {
    const examples = [
      'The editor can redact sensitive data.',
      'Redact and compress sensitive PDFs.',
      'Redaction is permanently applied; text is no longer extractable.',
      'Redaction is not available. The editor can redact sensitive data.',
      'Blackout is not permanently applied. Blackouts are permanently applied.',
      'Redaction is not available, but the editor can redact sensitive data.',
      'Redaction is unavailable; the editor can redact sensitive data.',
      'Redaction is unavailable, the editor can redact sensitive data.',
    ];

    for (const example of examples) {
      expect(hasPositiveRedactionClaim(example)).toBe(true);
    }

    const quarantinedExamples = [
      'The dedicated redaction workflow is disabled.',
      'Redaction is not available.',
      'Do not use redaction for sensitive content.',
    ];
    for (const example of quarantinedExamples) {
      expect(hasPositiveRedactionClaim(example)).toBe(false);
    }
  });

  it('describes the dedicated blackout workflow as unavailable and not a confidentiality boundary', () => {
    expect(blackoutDescription).toMatch(/unavailable/i);
    expect(blackoutDescription).toMatch(/confidentiality boundary/i);
    expect(blackoutDescription).not.toMatch(/permanently remove|un-extractable/i);
  });

  it('states the disabled blackout/redaction limitation in release descriptions', () => {
    expect(readme).toMatch(/dedicated blackout\/redaction[^.]*disabled/i);
    expect(tauriConfig.bundle.longDescription).toMatch(
      /dedicated blackout\/redaction[^.]*disabled/i,
    );
  });
});

/**
 * Absolute data-handling phrasing is false in the shipped app, and shipping in two
 * builds makes that worse: the public web beta has no AI key channel at all, and the
 * Tauri desktop build can hold a user-supplied Gemini key. A blanket "nothing ever
 * leaves / nothing is stored / no servers touched" sentence is therefore unprovable
 * in both builds, and the editor really does retain the working document and the edit
 * history in IndexedDB.
 *
 * Each pattern below is a claim the code cannot support, so a match on a
 * release-facing surface is a release-blocking defect. They are written as phrase
 * shapes (percentage absolutes, server-count absolutes, persistence absolutes,
 * tracking absolutes) rather than as exact sentences, so rewording the same lie does
 * not slip past them.
 */
const absoluteLocalOnlyClaims: { label: string; pattern: RegExp }[] = [
  { label: '100% FREE claim', pattern: /100%\s*free/i },
  { label: 'all processing happens locally', pattern: /all processing is done locally/i },
  { label: 'processes locally in your browser', pattern: /process(?:es|ing)? locally in your browser/i },
  { label: 'runs entirely on your device', pattern: /entirely on your device/i },
  { label: 'local-only version label', pattern: /v1\.0\s*·\s*local-only/i },
  { label: 'no uploads, no servers promise', pattern: /no uploads,\s*no servers/i },
  { label: 'files never leave claim', pattern: /files? never leave/i },
  // On-device / offline absolutes.
  {
    label: 'percent on-device claim',
    pattern: /\b\d{1,3}\s*%\s*(?:on[-\s]?device|offline|local|private|anonymous|secure)\b/i,
  },
  {
    label: 'on-device absolutism',
    pattern: /\b(?:entirely|fully|always|completely|purely|totally)\s+(?:on[-\s]?device|offline|local)\b/i,
  },
  {
    label: 'all-tools-on-device claim',
    pattern:
      /\b(?:all|every|each)\s+(?:of\s+)?(?:the\s+)?(?:tools?|processing|work|data|files?|documents?)\b[^.\n]{0,20}\b(?:on[-\s]?(?:your\s+)?device|offline)\b/i,
  },
  // Server-count and egress absolutes.
  {
    label: 'zero-server claim',
    pattern: /\b(?:zero|no|never|nil|not a single|nobody)\s+(?:servers?|cloud|backends?|remotes?|third[- ]party)\b/i,
  },
  // Quantitative egress metrics. The load-bearing containment sentence ("no file is
  // sent to an external service from those routes") is required copy, so only the
  // measured-byte shapes are banned here, not every negation.
  {
    label: 'zero-byte-egress claim',
    pattern: /\b(?:zero|nothing|no|not a single|0)\s*(?:bytes?|kb|mb|gb)\b[^.\n]{0,24}\b(?:uploaded|uploads?|sent|leaves?)\b/i,
  },
  {
    label: 'nothing-egress claim',
    pattern: /\bnothing\s+is\s+(?:ever\s+)?(?:uploaded|sent|transmitted|leaves)\b/i,
  },
  { label: 'phones-home claim', pattern: /\bphones?\s+home\b/i },
  // Persistence absolutes.
  {
    label: 'nothing-persists claim',
    pattern: /\b(?:nothing|never|no data|no files?|nobody)\b[^.\n]{0,40}\b(?:persist|stored|kept|remembered|retained)\b/i,
  },
  { label: 'always-zero claim', pattern: /\balways\s+(?:zero|0|nil|none|empty)\b/i },
  // Analytics absolutes: no tracker exists in this app, so "no tracking pixels" is a
  // promise about code that is not there rather than a measurement of anything.
  {
    label: 'no-tracking claim',
    pattern: /\b(?:no|zero|without|never)\s+track(?:ing|ers?)\b|\btrack(?:ing|ers?)\s+(?:pixels?|beacons?|scripts?)\b/i,
  },
];

/**
 * Content-based companion to the phrase list. A counter tile is a factual claim about
 * the running app, so a tile whose subject is bytes, uploads, persistence, servers,
 * devices, or egress must render a registry-derived value and must not hard-code a
 * number. "0 / Bytes uploaded / Always zero" was a guess; guessing is how the false
 * claim shipped, so the shape is rejected here even if the wording changes.
 */
const COUNTER_TILE_PATTERN = /<article className="bento-tile"[\s\S]*?<\/article>/g;
const DATA_SUBJECT_PATTERN = /bytes?|upload|persist|stor(?:e|ed|age)|server|device|egress|send|track/i;
const counterTiles = homeBentoSource.match(COUNTER_TILE_PATTERN) ?? [];
const dataCounterTiles = counterTiles.filter((tile) => DATA_SUBJECT_PATTERN.test(stripMarkup(tile)));

const footerSource = readSource('src/components/layout/Footer.tsx');
const sidebarSource = readSource('src/components/layout/Sidebar.tsx');

/**
 * B1.1 moved the footer's containment sentence out of the component and into the
 * English catalog, so the surface scan below has to read the catalog too — reading
 * only Footer.tsx would silently stop checking the sentence that ships.
 */
const enCatalogSource = readSource('src/i18n/locales/en.ts');

const containmentSurfaces: Record<string, string> = {
  Home: homeSource,
  HomeBento: homeBentoSource,
  Footer: `${footerSource}\n${enCatalogSource}`,
  Sidebar: sidebarSource,
  'Tauri shortDescription': tauriConfig.bundle.shortDescription,
  'Tauri longDescription': tauriConfig.bundle.longDescription,
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const GENERIC_TOOL_NAME_WORDS = new Set(['pdf', 'file', 'files', 'to', 'and', 'the']);

/**
 * 'AI Summarizer' -> /\bAI Summarizer\b/, 'OCR PDF' -> /\bOCR\b/,
 * 'PDF to PowerPoint' -> /\bPowerPoint\b/. Short or generic leading words are
 * skipped so the pattern cannot degenerate into a word that appears everywhere.
 */
const advertisingPattern = (toolName: string): RegExp => {
  const words = toolName.split(/[\s-]+/);
  const significant = words.filter((word) => !GENERIC_TOOL_NAME_WORDS.has(word.toLowerCase()));
  const first = significant[0] ?? toolName;
  const keyword = first.length < 3 ? significant.slice(0, 2).join(' ') : first;
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
};

const disabledToolNames = TOOL_CATEGORIES.flatMap((category) => category.tools)
  .filter((tool) => TOOL_RELEASE_REGISTRY[tool.id].releaseState === 'disabled')
  .map((tool) => toolCopyEn[tool.id].name);

const UNAVAILABILITY_QUALIFIER =
  /\b(?:unavailable|not available|disabled|currently|never|does not|do not)\b/i;

describe('release-facing containment claims', () => {
  it('keeps the disabled tool list non-empty for the installer assertion', () => {
    expect(disabledToolNames.length).toBeGreaterThan(0);
    expect(disabledToolNames).toEqual(
      expect.arrayContaining(['Compress PDF', 'AI Summarizer', 'Scan to PDF', 'Blackout PDF']),
    );
  });

  it('avoids absolute local-only phrasing on user-facing surfaces', () => {
    for (const [surface, source] of Object.entries(containmentSurfaces)) {
      for (const { label, pattern } of absoluteLocalOnlyClaims) {
        expect(source, `${surface}: ${label}`).not.toMatch(pattern);
      }
    }
  });

  it('states the containment boundary instead of a blanket local promise', () => {
    expect(homeSource).toMatch(/unavailable in the public beta/i);
    expect(enCatalogSource).toMatch(/unavailable in the public beta/i);
    expect(tauriConfig.bundle.longDescription).toMatch(/unavailable in this release/i);
  });

  it('does not advertise a disabled tool in the installer description', () => {
    const advertised = tauriConfig.bundle.longDescription
      .split(/(?<=[.!?;])\s+|\n+/)
      .filter((sentence) =>
        disabledToolNames.some((toolName) => advertisingPattern(toolName).test(sentence)),
      )
      .filter((sentence) => !UNAVAILABILITY_QUALIFIER.test(sentence));

    expect(advertised).toEqual([]);
  });
});

describe('release-facing data-handling claims', () => {
  it('rejects every absolute phrase shape the adversarial review found', () => {
    // The point of this test is the *shapes*, not these strings: a reworded lie with
    // the same absolutism has to fail too.
    const unsupportedAbsolutes = [
      '100% on-device',
      'All work is 100% on-device.',
      'Fully offline and private',
      '7 categories, zero servers touched.',
      'Nothing persists, nothing phones home.',
      'Nothing is stored.',
      'No bytes uploaded',
      '0 bytes uploaded',
      'Nothing is uploaded',
      'No tracking pixels',
      'No trackers at all',
      'Your files never leave this machine',
      'All processing happens on your device.',
      'Every tool runs offline',
    ];

    for (const claim of unsupportedAbsolutes) {
      expect(
        absoluteLocalOnlyClaims.some(({ pattern }) => pattern.test(claim)),
        `not guarded: ${claim}`,
      ).toBe(true);
    }
  });

  it('backs every data-handling counter tile with a registry-derived value', () => {
    expect(dataCounterTiles.length).toBeGreaterThan(0);

    for (const tile of dataCounterTiles) {
      expect(stripMarkup(tile), 'a data counter must render a derived value').toMatch(
        /\{[A-Za-z_$][\w$.]*\}/,
      );
      // A number typed into the markup is a guess, not a measurement, and guessing is
      // how "0 / Bytes uploaded / Always zero" became a false claim.
      expect(tile, 'a data counter must not hard-code its value').not.toMatch(/>\s*-?\d[\d,.]*\s*</);
    }
  });

  it('never presents the static example strip as a user history', () => {
    expect(homeBentoSource).not.toMatch(/recently used/i);
  });

  it('does not ship a "privacy guarantee" label for a documented behaviour', () => {
    expect(homeBentoSource).not.toMatch(/privacy guarantee/i);
  });
});

describe('in-page anchor integrity', () => {
  it('points every in-page anchor at an element that exists', () => {
    const surfaces: Record<string, string> = {
      Home: homeSource,
      HomeBento: homeBentoSource,
      Sidebar: sidebarSource,
      Layout: readSource('src/components/layout/Layout.tsx'),
    };
    const idExists = (id: string) =>
      srcSources.some(({ source }) => new RegExp(`id=["']${escapeRegExp(id)}["']`).test(source));

    for (const [name, source] of Object.entries(surfaces)) {
      const anchors = [
        ...[...source.matchAll(/(?:href|to)=["']#([A-Za-z][\w-]*)["']/g)].map((match) => match[1]),
        ...[...source.matchAll(/to=["']\/#([A-Za-z][\w-]*)["']/g)].map((match) => match[1]),
      ];

      for (const anchor of anchors) {
        expect(idExists(anchor), `${name} links to #${anchor}, which no element defines`).toBe(true);
      }
    }
  });
});

describe('desktop bundle description', () => {
  it('describes the Tauri app without calling its WebView a browser', () => {
    expect(tauriConfig.bundle.shortDescription).not.toMatch(/\bin (?:your|a|the) browser\b/i);
    expect(tauriConfig.bundle.shortDescription).toMatch(/locally on your desktop/i);
    expect(tauriConfig.bundle.longDescription).not.toMatch(/\bin your browser\b/i);
    expect(tauriConfig.bundle.longDescription).toMatch(/locally/i);
  });
});

describe('Gemini containment behind the "send nothing" copy', () => {
  const toolPageDir = resolve(process.cwd(), 'src/pages/tools');
  const toolPageFiles = readdirSync(toolPageDir)
    .filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'))
    .sort();
  const toolIdFromPageName = (name: string) =>
    name.replace(/\.tsx$/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

  const libAiImport = /from ['"][^'"]*lib\/ai['"]/;
  const geminiToolPages = toolPageFiles.filter((name) =>
    libAiImport.test(readFileSync(join(toolPageDir, name), 'utf8')),
  );
  const sdkImporters = srcSources
    .filter(({ source }) => /from ['"]@google\/genai['"]/.test(source))
    .map(({ path }) => path);
  const libAiImporters = srcSources
    .filter(({ path: path2, source }) => !path2.startsWith('src/pages/tools/') && libAiImport.test(source))
    .map(({ path: path2 }) => path2)
    .sort();
  const pagesNamingTheGeminiOrigin = srcSources
    .filter(({ path: path2, source }) => path2.startsWith('src/pages/') && /generativelanguage/i.test(source))
    .map(({ path: path2 }) => path2)
    .sort();

  it('reaches every AI request path only from a registry-disabled tool page', () => {
    // "Send nothing to an external service" is load-bearing routing, so pin the exact
    // set of pages that can issue a request. A new caller fails here.
    expect(geminiToolPages.map(toolIdFromPageName)).toEqual(['ai-summarizer', 'translate-pdf']);

    for (const page of geminiToolPages) {
      const toolId = toolIdFromPageName(page);
      const entry = TOOL_RELEASE_REGISTRY[toolId as keyof typeof TOOL_RELEASE_REGISTRY];
      expect(entry, `${page} has no registry entry`).toBeDefined();
      expect(entry.releaseState, `${page} must stay disabled for the no-egress copy to hold`).toBe(
        'disabled',
      );
    }
  });

  it('keeps the Gemini SDK behind a single lib module and out of every page', () => {
    expect(sdkImporters).toEqual(['src/lib/ai.ts']);
    expect(pagesNamingTheGeminiOrigin).toEqual([]);
  });

  it('lets only the key settings reach the AI module, and never call a model', () => {
    expect(libAiImporters).toEqual(['src/components/settings/ApiKeySettings.tsx']);
    // Comments explain why the key exists; they must not satisfy or trip this guard.
    const settings = readSource('src/components/settings/ApiKeySettings.tsx')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(settings).not.toMatch(/generateContent|\.models\b|\.chats\b|getGenAI/);
  });
});
