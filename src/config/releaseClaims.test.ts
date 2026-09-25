import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOL_CATEGORIES } from '../constants/tools';

type TauriConfig = {
  bundle: {
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
