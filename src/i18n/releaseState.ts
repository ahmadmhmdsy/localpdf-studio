import type { MessageKey } from './index';
import type { ReleaseState } from '../config/featureRegistry';

/**
 * Locale keys for the release-state copy (B1.2b). The registry stays the source
 * of truth for a tool's state; only the wording lives in the catalogs.
 */
export function releaseStateBadgeKey(releaseState: ReleaseState): MessageKey | null {
  switch (releaseState) {
    case 'disabled':
      return 'home.status.unavailable';
    case 'limited':
      return 'home.status.limited';
    case 'experimental':
      return 'home.status.experimental';
    default:
      return null;
  }
}

/** Short adjective used by the bento availability summary ("6 stable"). */
export function releaseStateSummaryKey(
  releaseState: 'stable' | 'limited' | 'experimental',
): MessageKey {
  switch (releaseState) {
    case 'limited':
      return 'home.release.limited';
    case 'experimental':
      return 'home.release.experimental';
    default:
      return 'home.release.stable';
  }
}
