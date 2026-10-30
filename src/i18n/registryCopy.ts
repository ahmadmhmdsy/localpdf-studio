import { getToolAvailability, getToolPrivacyNotice, type ToolId } from '../config/featureRegistry';
import { availabilityCopyAr, privacyNoticesAr, type AvailabilityCopy } from './locales/registry.ar';
import type { Locale } from './index';

export type { AvailabilityCopy };

/**
 * Locale-bound registry sentences (B1.4c). The registry stays the English
 * source because it is the release record; other locales are looked up here,
 * and release state and privacy class are always read from the registry.
 */
export function availabilityCopy(locale: Locale, toolId: ToolId): AvailabilityCopy {
  if (locale === 'ar') return availabilityCopyAr[toolId] ?? getToolAvailability(toolId);
  return getToolAvailability(toolId);
}

/** The data-handling sentence for one tool in one locale. */
export function privacyNotice(locale: Locale, toolId: ToolId): string {
  if (locale === 'ar') return privacyNoticesAr[getToolAvailability(toolId).privacy];
  return getToolPrivacyNotice(toolId);
}
