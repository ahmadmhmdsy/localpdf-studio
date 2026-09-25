import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOL_CATEGORIES } from '../constants/tools';
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
const blackoutDescription =
  TOOL_CATEGORIES.flatMap((category) => category.tools).find(
    (tool) => tool.id === 'blackout-pdf',
  )?.description ?? '';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
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
 * Absolute "everything stays on your device" phrasing is false in the public beta:
 * AI, OCR, and camera tools are disabled and send nothing, but the copy must say so
 * instead of promising that every tool is local. Each pattern below is a claim the
 * registry cannot support, so a matching surface is a release-blocking defect.
 */
const absoluteLocalOnlyClaims: { label: string; pattern: RegExp }[] = [
  { label: '100% FREE claim', pattern: /100%\s*free/i },
  { label: 'all processing happens locally', pattern: /all processing is done locally/i },
  { label: 'processes locally in your browser', pattern: /process(?:es|ing)? locally in your browser/i },
  { label: 'runs entirely on your device', pattern: /entirely on your device/i },
  { label: 'local-only version label', pattern: /v1\.0\s*·\s*local-only/i },
  { label: 'no uploads, no servers promise', pattern: /no uploads,\s*no servers/i },
  { label: 'files never leave claim', pattern: /files? never leave/i },
];

const footerSource = readSource('src/components/layout/Footer.tsx');
const sidebarSource = readSource('src/components/layout/Sidebar.tsx');

const containmentSurfaces: Record<string, string> = {
  Home: homeSource,
  HomeBento: homeBentoSource,
  Footer: footerSource,
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
  .map((tool) => tool.name);

const UNAVAILABILITY_QUALIFIER =
  /\b(?:unavailable|not available|disabled|currently|never|does not|do not)\b/i;

describe('release-facing containment claims', () => {
  it('keeps the disabled tool list non-empty for the installer assertion', () => {
    expect(disabledToolNames.length).toBeGreaterThan(0);
    expect(disabledToolNames).toEqual(
      expect.arrayContaining(['OCR PDF', 'Compress PDF', 'AI Summarizer', 'Scan to PDF', 'Blackout PDF']),
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
    expect(footerSource).toMatch(/unavailable in the public beta/i);
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
