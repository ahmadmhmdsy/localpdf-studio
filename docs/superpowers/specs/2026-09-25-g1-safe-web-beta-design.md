# G1 Safe Web Beta Containment Design

**Date:** 2026-09-25
**Status:** Approved for implementation
**Scope:** Public web beta only

## Goal

Make the public web build safe and truthful for a limited beta: no quarantined security, AI, OCR, or camera workflow may mount a misleading success path; privacy copy must match actual data flow; and the release must have production-browser accessibility and smoke coverage.

## Design decision

Use containment-first remediation. The existing feature registry remains the single source of truth for release state and privacy class. Known unsafe or blocked tools stay unavailable in the public web target until a later, separately verified implementation plan provides a real security boundary, local assets, consent, cancellation, and output verification.

This is intentionally different from re-enabling the tools with mocked or partial implementations. It satisfies the G1 safe-web-beta gate without making unsupported security or privacy claims.

## User-visible behavior

- Stable tools render their existing workflow.
- Limited and experimental tools render their workflow with the registry limitation.
- Disabled tools render an unavailable screen and never mount their uploader, processing state, or download state.
- The local-only, optional-network, and camera privacy classes are displayed next to the relevant action.
- A missing route renders a semantic not-found page with a heading and recovery link.
- Icon-only and previously unnamed links have accessible names.
- The public web target cannot load a build-time Gemini key or issue AI/OCR requests from a disabled route.

## Data-flow boundary

The feature registry classifies every tool as one of:

- `local-only`: file bytes and derived data remain in the browser process;
- `optional-network`: a request is allowed only after a future explicit-consent flow; current public routes remain disabled;
- `camera`: camera permission is requested only by the Scan route; current public route remains disabled until permission and fallback behavior are verified.

The privacy notice must not claim that all files remain local. It must describe the selected tool class and, for any future enabled network tool, the provider and destination.

## Security boundary

Protect PDF, Decrypt PDF, Blackout PDF, and editor redaction remain disabled/quarantined. Their implementations are not changed in this G1 slice. The redaction quarantine and compatibility redirects remain intact. A disabled route must be testable without instantiating the underlying workflow.

## Accessibility boundary

The G1 accessibility slice covers route semantics, link names, focusable controls, status/error announcements, keyboard reachability, and automated axe checks for representative pages. It does not claim a complete WCAG conformance audit; manual screen-reader and keyboard verification remains a later release activity.

## Browser verification boundary

Playwright runs against the production Vite build, not only jsdom. The smoke suite covers:

- home and representative stable/limited/disabled routes;
- compatibility redirects;
- unknown-route recovery;
- privacy disclosure text;
- disabled-tool upload/processing absence;
- no AI/OCR network requests from disabled routes;
- axe checks for representative pages.

## Non-goals

- Re-enabling or claiming secure Protect/Decrypt/Redaction.
- Re-enabling camera or OCR.
- Removing the redaction quarantine.
- Native packaging, signing, notarization, updater, or desktop release work.
- G2–G4 release-candidate or cross-platform work.

## Acceptance criteria

1. Every route is covered by the registry gate, aliases resolve to truthful states, and unknown routes have semantic recovery content.
2. No disabled tool mounts its workflow or reaches a processing/download success state.
3. Privacy copy is derived from the registry and contains no absolute local-only claim for network/camera tools.
4. Disabled AI/OCR routes make zero network requests in the browser test.
5. Production-browser smoke and axe checks pass.
6. Existing G0 gates remain green, and the final diff has no redaction implementation changes.
