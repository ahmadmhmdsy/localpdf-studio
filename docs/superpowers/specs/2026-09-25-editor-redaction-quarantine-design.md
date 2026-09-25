# Editor Redaction Quarantine Design

**Date:** 2026-09-25  
**Status:** Approved policy, implementation pending  
**Scope:** Phase 0 final-review fix

## Context

The canonical disabled redaction/blackout route is protected by
`ToolAvailabilityGate`, but the legacy visual editor still has independent
`redact` activation paths: the `tool=redact-pdf` query parameter, Ctrl+R, and
the editor toolbar. A visual redaction shape can therefore be created and
exported outside the disabled-tool boundary. The existing warning explains the
limitation, but a warning is not a structural quarantine.

The approved policy is **full editor quarantine**: the editor will not expose
or activate a redaction workflow. This does not change the dedicated blackout
route's registry state or implement true content-stream redaction.

## Goals

- Prevent editor query, keyboard, toolbar, and legacy Home mappings from
  activating redaction.
- Ensure legacy redaction annotations restored from IndexedDB cannot be
  rendered or included in editor exports.
- Preserve safe handling of old annotation data without throwing or silently
  destructively rewriting the user's history.
- Keep all other editor tools and the canonical disabled blackout route
  unchanged.
- Add regression coverage for each former activation path and the export
  boundary.

## Non-goals

- Enabling or improving the disabled blackout tool.
- Changing redaction behavior in `src/lib/security.ts` or the blackout page.
- Removing the `RedactAnnotation` type immediately; retaining the type allows
  old IndexedDB records to deserialize safely.
- Changing unrelated editor annotations, persistence keys, or navigation.

## Design

### Activation boundary

Remove `redact-pdf` from the editor's supported query mappings and remove the
Ctrl+R handler. Remove the redaction button from `ToolPicker`, and remove the
legacy `redact-pdf` entry from the Home editor-integration list. The editor
will therefore have no user-facing path that sets `activeTool` to `redact`.

### Legacy data defense

`AnnotationLayer` will not create or render redaction annotations. `Toolbar`
will skip legacy redaction records while composing exported annotations, and
its redaction-confirmation branch will be removed because no editor-created
redaction can be produced. `PropertiesPanel` will no longer expose redaction
settings. The existing `RedactAnnotation` union member and component may remain
as inert compatibility code until a future data migration explicitly removes
it; they must not be reachable from the editor workflow.

This is intentionally a fail-closed UI/workflow change: a stale record is
ignored rather than treated as a confidentiality operation. No automatic
history deletion or IndexedDB rewrite is performed.

### Documentation and messaging

Remove the editor redaction claim from the onboarding tour. Do not claim that
the editor provides redaction. Existing canonical-route messaging and the
blackout route remain governed by the feature registry and the Phase 0
production inventory.

## Testing strategy

Use test-driven development for each behavior:

1. Add a failing test proving the toolbar no longer renders a redaction
   affordance and that clicking a former redaction control cannot call
   `setActiveTool('redact')`.
2. Add failing editor integration tests for `?tool=redact-pdf` and Ctrl+R,
   asserting the editor remains on a non-redaction tool and does not mount or
   activate a redaction workflow.
3. Add a regression test for legacy annotation data proving redaction records
   are not rendered or passed to the export annotation renderer, while normal
   annotations still render/export.
4. Run the focused tests, typecheck, lint, and the existing relevant editor
   tests. Do not change coverage thresholds or dependency versions.

## Risks and mitigations

- **Old annotations:** ignore redaction records at render/export boundaries;
  keep their type for safe deserialization.
- **Regression to other tools:** use focused existing editor tests and avoid
  changing shared store contracts.
- **False security claim:** keep the canonical blackout route disabled and
  continue to state that no editor path is a confidentiality boundary.

## Acceptance criteria

A reviewer can navigate to `/editor?tool=redact-pdf`, press Ctrl+R, and inspect
the editor toolbar without finding a redaction activation or redaction-specific
export path. Legacy redaction records do not appear or affect editor export. The dedicated
blackout route remains governed by its existing disabled registry entry, and
Gate G0 remains explicitly not passed because its audit blocker is unchanged.
