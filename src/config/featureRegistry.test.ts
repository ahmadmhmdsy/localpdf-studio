import { describe, it, expect } from 'vitest';
import {
  TOOL_RELEASE_REGISTRY,
  getToolAvailability,
  isToolAvailable,
  type ToolId,
  type ReleaseState,
  type PrivacyClass,
} from './featureRegistry';

const ALL_IDS: readonly ToolId[] = [
  'merge-pdf', 'split-pdf', 'remove-pages', 'extract-pages', 'organize-pdf',
  'scan-to-pdf', 'compress-pdf', 'repair-pdf', 'ocr-pdf', 'jpg-to-pdf',
  'html-to-pdf', 'word-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf',
  'pdf-to-jpg', 'pdf-to-pdfa', 'pdf-to-word', 'pdf-to-excel',
  'pdf-to-powerpoint', 'rotate-pdf', 'add-page-numbers', 'add-watermark',
  'crop-pdf', 'edit-pdf', 'sign-pdf', 'blackout-pdf', 'compare-pdf',
  'decrypt-pdf', 'protect-pdf', 'ai-summarizer', 'translate-pdf',
];

const EXPECTED_STATES: Record<ToolId, ReleaseState> = {
  'merge-pdf': 'stable',
  'split-pdf': 'limited',
  'remove-pages': 'limited',
  'extract-pages': 'limited',
  'organize-pdf': 'limited',
  'scan-to-pdf': 'disabled',
  'compress-pdf': 'disabled',
  'repair-pdf': 'limited',
  'ocr-pdf': 'disabled',
  'jpg-to-pdf': 'limited',
  'html-to-pdf': 'limited',
  'word-to-pdf': 'limited',
  'excel-to-pdf': 'limited',
  'powerpoint-to-pdf': 'limited',
  'pdf-to-jpg': 'stable',
  'pdf-to-pdfa': 'limited',
  'pdf-to-word': 'limited',
  'pdf-to-excel': 'limited',
  'pdf-to-powerpoint': 'disabled',
  'rotate-pdf': 'stable',
  'add-page-numbers': 'limited',
  'add-watermark': 'limited',
  'crop-pdf': 'stable',
  'edit-pdf': 'limited',
  'sign-pdf': 'limited',
  'blackout-pdf': 'disabled',
  'compare-pdf': 'stable',
  'decrypt-pdf': 'disabled',
  'protect-pdf': 'disabled',
  'ai-summarizer': 'disabled',
  'translate-pdf': 'disabled',
};

const EXPECTED_PRIVACY: Record<PrivacyClass, ToolId[]> = {
  'optional-network': ['ai-summarizer', 'translate-pdf'],
  'camera': ['scan-to-pdf'],
  'local-only': [
    'merge-pdf', 'split-pdf', 'remove-pages', 'extract-pages', 'organize-pdf',
    'compress-pdf', 'repair-pdf', 'ocr-pdf', 'jpg-to-pdf', 'html-to-pdf',
    'word-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf', 'pdf-to-jpg',
    'pdf-to-pdfa', 'pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint',
    'rotate-pdf', 'add-page-numbers', 'add-watermark', 'crop-pdf', 'edit-pdf',
    'sign-pdf', 'blackout-pdf', 'compare-pdf', 'decrypt-pdf', 'protect-pdf',
  ],
};

// Unavailable messaging must not make success/security/completeness claims.
const BANNED_PHRASES = [
  'success',
  'secure',
  'security',
  'completeness',
  'completely',
  'fully',
  '100% local',
  'never leave',
];

describe('TOOL_RELEASE_REGISTRY', () => {
  it('contains exactly the 31 known tool ids', () => {
    const registryIds = Object.keys(TOOL_RELEASE_REGISTRY).sort();
    expect(registryIds).toEqual([...ALL_IDS].sort());
  });

  it('assigns the exact audited release state groups from the Task 1 inventory', () => {
    for (const id of ALL_IDS) {
      expect(TOOL_RELEASE_REGISTRY[id].releaseState, id).toBe(EXPECTED_STATES[id]);
    }
    const disabled = ALL_IDS.filter((id) => TOOL_RELEASE_REGISTRY[id].releaseState === 'disabled');
    expect(disabled.sort()).toEqual([
      'ai-summarizer', 'blackout-pdf', 'compress-pdf', 'decrypt-pdf',
      'ocr-pdf', 'pdf-to-powerpoint', 'protect-pdf', 'scan-to-pdf',
      'translate-pdf',
    ].sort());
    const stable = ALL_IDS.filter((id) => TOOL_RELEASE_REGISTRY[id].releaseState === 'stable');
    expect(stable.sort()).toEqual(
      ['compare-pdf', 'crop-pdf', 'merge-pdf', 'pdf-to-jpg', 'rotate-pdf'].sort()
    );
  });

  it('assigns the expected privacy classes', () => {
    for (const [privacyClass, ids] of Object.entries(EXPECTED_PRIVACY) as [PrivacyClass, ToolId[]][]) {
      for (const id of ids) {
        expect(TOOL_RELEASE_REGISTRY[id].privacy, id).toBe(privacyClass);
      }
    }
    for (const id of ALL_IDS) {
      expect(EXPECTED_PRIVACY[TOOL_RELEASE_REGISTRY[id].privacy]).toContain(id);
    }
  });

  it('has non-empty support and limitation text for every entry', () => {
    for (const id of ALL_IDS) {
      const entry = TOOL_RELEASE_REGISTRY[id];
      expect(entry.support.trim().length, `support: ${id}`).toBeGreaterThan(0);
      expect(entry.limitation.trim().length, `limitation: ${id}`).toBeGreaterThan(0);
    }
  });

  it('uses the stable boilerplate support text for stable entries', () => {
    for (const id of ALL_IDS.filter((i) => EXPECTED_STATES[i] === 'stable')) {
      expect(TOOL_RELEASE_REGISTRY[id].support).toBe(
        'No known blocking limitation for the narrow workflow'
      );
    }
  });

  it('does not claim success, security, completeness, or local processing in disabled messaging', () => {
    for (const id of ALL_IDS.filter((i) => TOOL_RELEASE_REGISTRY[i].releaseState === 'disabled')) {
      const message = `- ${TOOL_RELEASE_REGISTRY[id].support} - ${TOOL_RELEASE_REGISTRY[id].limitation}`;
      for (const phrase of BANNED_PHRASES) {
        expect(message.toLowerCase(), `${id} must not contain "${phrase}"`).not.toContain(phrase);
      }
    }
  });
});

describe('getToolAvailability', () => {
  it('returns the registry entry for a tool id', () => {
    expect(getToolAvailability('merge-pdf')).toEqual(TOOL_RELEASE_REGISTRY['merge-pdf']);
    expect(getToolAvailability('protect-pdf')).toEqual(TOOL_RELEASE_REGISTRY['protect-pdf']);
  });
});

describe('isToolAvailable', () => {
  it('returns true for stable and limited tools', () => {
    expect(isToolAvailable('merge-pdf')).toBe(true);
    expect(isToolAvailable('split-pdf')).toBe(true);
  });

  it('returns false for disabled tools', () => {
    expect(isToolAvailable('blackout-pdf')).toBe(false);
    expect(isToolAvailable('decrypt-pdf')).toBe(false);
    expect(isToolAvailable('protect-pdf')).toBe(false);
    expect(isToolAvailable('compress-pdf')).toBe(false);
    expect(isToolAvailable('ocr-pdf')).toBe(false);
    expect(isToolAvailable('scan-to-pdf')).toBe(false);
    expect(isToolAvailable('pdf-to-powerpoint')).toBe(false);
    expect(isToolAvailable('ai-summarizer')).toBe(false);
    expect(isToolAvailable('translate-pdf')).toBe(false);
  });
});
