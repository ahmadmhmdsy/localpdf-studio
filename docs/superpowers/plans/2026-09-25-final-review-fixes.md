# Final Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Remove every user-facing editor redaction activation and make legacy editor redaction records inert, while correcting the final review's lockfile and release-inventory evidence.

**Architecture:** Keep the canonical disabled blackout route unchanged. Fully quarantine the separate visual editor: the editor store may still deserialize the legacy RedactAnnotation type, but the editor will not activate, render, configure, or export redaction records. Correct documentation separately from runtime behavior; do not change dependencies, lockfile contents, coverage thresholds, or Gate G0 evidence.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Zustand, React Router 7, Vitest 4, Testing Library, pdf-lib, npm 11.16.0, Node 22.14.0.

---

## Global constraints

- Work on the existing branch production-readiness/phase-0.
- Preserve all prior commits and user files. Do not reset, amend, merge, push, tag, sign, deploy, publish, or request sandbox escalation.
- Use the exact supported runtime: Node 22.14.0 and npm 11.16.0. Do not use system Node 24.x as validation evidence.
- Do not add or update dependencies, change package.json dependency ranges, regenerate package-lock.json, or change coverage thresholds.
- Keep the canonical blackout route releaseState disabled and do not change src/lib/security.ts or the blackout workflow.
- Remove editor redaction entry points structurally; a warning alone is not a quarantine.
- Preserve the RedactAnnotation type and old IndexedDB data compatibility; ignore legacy records at render/export boundaries without deleting or rewriting history.
- Use condition-based waits and explicit assertions in tests. No arbitrary sleeps, retries, skipped tests, weakened assertions, or production changes solely for mocks.
- Update ignored .superpowers/sdd evidence without staging it. Tracked files must contain only the scoped fixes and truthful documentation.
- Gate G0 remains NOT PASSED; do not change the recorded audit result.

## File map

Runtime quarantine:
- Modify src/pages/Editor.tsx to remove the redact-pdf query mapping and Ctrl+R shortcut.
- Modify src/pages/Home.tsx to remove redact-pdf from the editor-integration list.
- Modify src/components/editor/toolbar/ToolPicker.tsx to remove the redaction button and now-unused Square import.
- Modify src/components/editor/AnnotationLayer.tsx to remove redaction creation and rendering branches while retaining text, image, crop, and draw behavior.
- Modify src/components/editor/Toolbar.tsx to remove redaction export handling, redaction warning modal state, and redaction annotation rendering.
- Modify src/components/editor/PropertiesPanel.tsx to remove redaction settings and now-unused imports.
- Modify src/components/onboarding/OnboardingTour.tsx to stop advertising editor redaction.
- Modify src/config/featureRegistry.ts to describe the editor as having no redaction workflow, not as a visual-only workflow.

Tests:
- Modify src/components/editor/Toolbar.test.tsx.
- Modify src/components/editor/PropertiesPanel.test.tsx.
- Create src/pages/Editor.test.tsx for query and keyboard integration coverage.
- Create src/components/editor/AnnotationLayer.test.tsx for creation/render quarantine coverage.

Evidence/documentation:
- Modify .superpowers/sdd/task-3-report.md with a literal path-keyed lock comparison; this file is ignored and must not be staged.
- Modify docs/release/production-inventory.md to distinguish baseline classifications from current Task 2 enforcement and point to the current registry/gate.

---

### Task 1: Add failing quarantine regression tests

**Files:**
- Modify: src/components/editor/Toolbar.test.tsx
- Modify: src/components/editor/PropertiesPanel.test.tsx
- Create: src/pages/Editor.test.tsx
- Create: src/components/editor/AnnotationLayer.test.tsx

- [ ] **Step 1: Change the toolbar expectation to the desired behavior.**

In Toolbar.test.tsx, replace the existing positive assertion:

~~~tsx
expect(screen.getByLabelText('Redact')).toBeInTheDocument();
~~~

with:

~~~tsx
expect(screen.queryByLabelText('Redact')).not.toBeInTheDocument();
~~~

- [ ] **Step 1b: Add a failing legacy export assertion to Toolbar.test.tsx.**

Add a test that supplies both a normal text annotation and a legacy redaction annotation, mocks one PDF page with drawText and drawRectangle spies, clicks Export All, and asserts:

~~~tsx
expect(drawText).toHaveBeenCalled();
expect(drawRectangle).not.toHaveBeenCalled();
expect(screen.queryByText('Redaction warning')).not.toBeInTheDocument();
~~~

Before the implementation change, the redaction record opens the confirmation modal and drawText is not called, so this test must fail for the expected reason. Keep the normal text assertion so the test proves other editor annotations still export.

- [ ] **Step 2: Add a failing legacy-data assertion to PropertiesPanel.test.tsx.**

Add a test using a selected legacy annotation:

~~~tsx
it('does not expose redaction settings for a legacy redaction record', () => {
  vi.spyOn(ToolsStoreModule, 'useToolsStore').mockReturnValue({
    activeTool: 'select',
    propertiesPanelVisible: true,
  } as any);
  vi.spyOn(DocumentStoreModule, 'useDocumentStore').mockReturnValue({
    file: mockFile,
    pages: [],
  } as any);
  vi.spyOn(AnnotationsStoreModule, 'useAnnotationsStore').mockReturnValue({
    annotations: [{
      id: 'legacy-redaction',
      pageId: 'page-0',
      type: 'redact',
      x: 0.5,
      y: 0.5,
      width: 0.2,
      height: 0.05,
      color: 'black',
    }],
    selectedAnnotationId: 'legacy-redaction',
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
  } as any);

  render(<PropertiesPanel />);

  expect(screen.queryByText('Fill Color')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete Redaction' })).not.toBeInTheDocument();
});
~~~

- [ ] **Step 3: Create the failing AnnotationLayer test.**

Create src/components/editor/AnnotationLayer.test.tsx. Mock the editor hook and annotation item components. The test must render one legacy redact record and one text record, then assert that only the text item is mounted. It must also set activeTool to 'redact', dispatch a pointer event to the layer, and assert addAnnotation was not called.

Use this shape (adapt imports to the existing module exports, but preserve the assertions):

~~~tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnnotationLayer from './AnnotationLayer';
import * as EditorContextModule from '../../contexts/EditorContext';

vi.mock('./annotations/TextAnnotationItem', () => ({
  default: () => <div data-testid="text-annotation" />,
}));
vi.mock('./annotations/ImageAnnotationItem', () => ({
  default: () => <div data-testid="image-annotation" />,
}));
vi.mock('./annotations/RedactAnnotationItem', () => ({
  default: () => <div data-testid="redact-annotation" />,
}));
vi.mock('./annotations/CropAnnotationItem', () => ({
  default: () => <div data-testid="crop-annotation" />,
}));
vi.mock('./annotations/DrawAnnotationItem', () => ({
  default: () => <div data-testid="draw-annotation" />,
}));

describe('AnnotationLayer redaction quarantine', () => {
  const addAnnotation = vi.fn();
  const setSelectedAnnotationId = vi.fn();
  const setActiveTool = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(EditorContextModule, 'useEditor').mockReturnValue({
      pages: [{ id: 'page-0', originalIndex: 0, rotation: 0 }],
      currentPage: 1,
      annotations: [
        { id: 'text-1', pageId: 'page-0', type: 'text', text: 'hello', x: 0.2, y: 0.2, fontSize: 12, color: 'black' },
        { id: 'redact-1', pageId: 'page-0', type: 'redact', x: 0.5, y: 0.5, width: 0.2, height: 0.05, color: 'black' },
      ],
      activeTool: 'select',
      addAnnotation,
      setSelectedAnnotationId,
      setActiveTool,
    } as any);
  });

  it('does not render a legacy redaction record', () => {
    render(<AnnotationLayer />);
    expect(screen.getByTestId('text-annotation')).toBeInTheDocument();
    expect(screen.queryByTestId('redact-annotation')).not.toBeInTheDocument();
  });

  it('does not create a redaction record when legacy activeTool is redact', () => {
    vi.spyOn(EditorContextModule, 'useEditor').mockReturnValue({
      pages: [{ id: 'page-0', originalIndex: 0, rotation: 0 }],
      currentPage: 1,
      annotations: [],
      activeTool: 'redact',
      addAnnotation,
      setSelectedAnnotationId,
      setActiveTool,
    } as any);

    const { container } = render(<AnnotationLayer />);
    const layer = container.firstElementChild as HTMLElement;
    fireEvent.pointerDown(layer, {
      clientX: 10,
      clientY: 10,
    });

    expect(addAnnotation).not.toHaveBeenCalled();
  });
});
~~~

Use the rendered container's first element as the layer target; do not add a production test-only attribute. Keep the explicit no-annotation assertion.

- [ ] **Step 4: Create the failing Editor integration test.**

Create src/pages/Editor.test.tsx with MemoryRouter initialEntries for /editor?tool=redact-pdf. Mock EditorWorkspace and the heavy editor children, and capture the array passed to useKeyboardShortcuts. Assert:

~~~tsx
expect(setActiveTool).not.toHaveBeenCalledWith('redact');
const shortcut = capturedShortcuts.find(
  (entry: { key: string; ctrl?: boolean }) => entry.key === 'r' && entry.ctrl,
);
expect(shortcut).toBeUndefined();
~~~

Also render with /editor?tool=crop-pdf and assert the existing crop mapping still calls setActiveTool('crop'), so the test proves quarantine did not disable unrelated editor tools. Use existing store spy patterns from Toolbar.test.tsx and ensure effects are awaited with waitFor rather than a fixed sleep.

- [ ] **Step 5: Run the focused tests and verify RED.**

Run with the pinned npm CLI:

~~~powershell
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" test -- --run src/components/editor/Toolbar.test.tsx src/components/editor/PropertiesPanel.test.tsx src/components/editor/AnnotationLayer.test.tsx src/pages/Editor.test.tsx
~~~

Expected: FAIL because the current toolbar still exposes Redact, the editor still maps redact-pdf and Ctrl+R, and the legacy redaction branches still render/process records. The failure must be an assertion failure caused by the missing quarantine, not a test setup/import error.

---

### Task 2: Implement the full editor quarantine

**Files:**
- Modify: src/pages/Editor.tsx
- Modify: src/pages/Home.tsx
- Modify: src/components/editor/toolbar/ToolPicker.tsx
- Modify: src/components/editor/AnnotationLayer.tsx
- Modify: src/components/editor/Toolbar.tsx
- Modify: src/components/editor/PropertiesPanel.tsx
- Modify: src/components/onboarding/OnboardingTour.tsx
- Modify: src/config/featureRegistry.ts
- Modify: src/components/editor/Toolbar.test.tsx
- Modify: src/components/editor/PropertiesPanel.test.tsx
- Test: src/components/editor/AnnotationLayer.test.tsx
- Test: src/pages/Editor.test.tsx

- [ ] **Step 1: Remove query and keyboard activation.**

In Editor.tsx, delete only the redact-pdf branch:

~~~tsx
else if (toolParam === 'redact-pdf') setActiveTool('redact');
~~~

Delete the Ctrl+R shortcut entry:

~~~tsx
{ key: 'r', ctrl: true, handler: () => setActiveTool('redact') },
~~~

Keep all other query mappings and shortcuts unchanged. Do not add a redirect or a new editor redaction mode.

- [ ] **Step 2: Remove the toolbar and Home entry points.**

In ToolPicker.tsx, remove Square from the lucide-react import and remove the complete button whose onClick calls onSelect('redact'). In Home.tsx, remove only the trailing 'redact-pdf' item from EDITOR_INTEGRATED_TOOLS. Leave the canonical /tools/blackout-pdf route and registry entry unchanged.

- [ ] **Step 3: Make legacy redaction records inert in the editor.**

In AnnotationLayer.tsx:

- Remove RedactAnnotation and RedactAnnotationItem imports.
- Remove the activeTool === 'redact' pointer branch.
- Remove the ann.type === 'redact' render branch.
- Leave all other annotation branches and pointer behavior unchanged.

In Toolbar.tsx:

- Remove the RedactAnnotation import.
- Remove the ann.type === 'redact' branch from renderAnnotations.
- Remove ConfirmModal import, showRedactConfirm state, doExportRef, hasRedactions detection, and the redaction warning modal JSX.
- Make handleExport call doExport directly after the existing no-file/no-pages guard.

In PropertiesPanel.tsx:

- Remove RedactAnnotation from the type import and REDACT_COLORS from the colors import.
- Remove the complete activeTool/selectedAnnotation redaction settings block.
- Leave text, image, crop, and draw settings unchanged.

Do not delete the RedactAnnotation type or RedactAnnotationItem file in this task; they are retained only for old-data compatibility and are no longer reachable from the editor workflow.

- [ ] **Step 4: Correct user-facing and registry wording.**

In OnboardingTour.tsx, change the editor step to:

~~~tsx
'Open /editor for the visual workspace: reorder pages, annotate, sign, and export. ' +
  'Press ? at any time to see all keyboard shortcuts.',
~~~

In featureRegistry.ts, replace the blackout limitation with wording that says the editor has no redaction workflow and the dedicated blackout path remains disabled and is not a confidentiality boundary. Do not change blackout releaseState, privacy, support, or any other registry entry.

- [ ] **Step 5: Run the focused tests and verify GREEN.**

Run the same pinned command from Task 1. Expected: all four focused test files pass with no failures. Confirm the legacy redaction test asserts absence, not merely a warning.

- [ ] **Step 6: Run static checks for the touched runtime files.**

~~~powershell
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" run typecheck
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" run lint
~~~

Expected: exit 0 for both. Existing lint warnings may remain, but no new errors are allowed.

- [ ] **Step 7: Commit the runtime quarantine.**

~~~powershell
git add src/pages/Editor.tsx src/pages/Home.tsx src/components/editor/toolbar/ToolPicker.tsx src/components/editor/AnnotationLayer.tsx src/components/editor/Toolbar.tsx src/components/editor/PropertiesPanel.tsx src/components/onboarding/OnboardingTour.tsx src/config/featureRegistry.ts src/components/editor/Toolbar.test.tsx src/components/editor/PropertiesPanel.test.tsx src/components/editor/AnnotationLayer.test.tsx src/pages/Editor.test.tsx
git commit -m "fix: quarantine editor redaction workflow"
~~~

Do not stage .superpowers files.

---

### Task 3: Correct lockfile evidence and release inventory

**Files:**
- Modify: .superpowers/sdd/task-3-report.md (ignored; do not stage)
- Modify: docs/release/production-inventory.md

- [ ] **Step 1: Generate and record a literal path-keyed lock comparison.**

Compare 38c3f04^:package-lock.json with 38c3f04:package-lock.json by parsing each JSON packages object and comparing keys and version values. Record the exact result in task-3-report.md:

~~~text
base package paths: 660
result package paths: 718
added paths: 58
removed paths: 0
version-changed paths: 0
~~~

List all 58 added paths literally, including the @img/sharp platform paths, @tauri-apps paths, @types paths, csstype, sharp, and nested emnapi/wasm-runtime paths. Record:

~~~text
removed paths: (none)
version-changed paths: (none)
~~~

Explain that a unified text diff can show deleted blocks for entries such as @isaacs/cliui, @jridgewell/*, and @napi-rs/canvas/* when npm reorders or rewrites fields, but a path-keyed JSON comparison proves those paths remain. Therefore the removed-path classification is empty; no stale-lock pruning deletion can be claimed from this commit. Do not invent deletions or change the lockfile.

- [ ] **Step 2: Update the inventory's current-enforcement wording.**

Preserve the baseline commit and all 31 audited rows, but change the status and future-tense text so it accurately distinguishes baseline classification from current Phase 0 enforcement. The revised status must state that release states are remediation planning states, not release approval, and that the Task 2 registry/gate now prevents disabled tools from reaching processing/download success. Reference src/config/featureRegistry.ts and src/components/tools/ToolAvailabilityGate.tsx. Replace the statements that the registry 'will' land or that tools remain reachable with current-enforcement wording. Do not claim production readiness or that any tool is approved for release.

- [ ] **Step 3: Verify evidence and documentation consistency.**

Run:

~~~powershell
git diff --check
git grep -n -E "redact-pdf|activeTool.*redact|Ctrl\+R|Redaction warning|visual-only" -- src docs/release/production-inventory.md
~~~

Expected: no editor activation/export references in the quarantined paths. Remaining redact-pdf mentions may exist only in the canonical disabled compatibility route/registry and in explicit historical/audit evidence. Confirm the inventory says the registry/gate is already implemented and still says stable is not release approval.

- [ ] **Step 4: Commit tracked documentation only.**

~~~powershell
git add docs/release/production-inventory.md
git commit -m "docs: reconcile release inventory with phase zero gates"
~~~

The ignored task-3-report.md remains a local evidence artifact and must not be included in the commit.

---

### Task 4: Full validation and final review handoff

**Files:**
- No additional source changes expected.

- [ ] **Step 1: Verify the pinned runtime.**

~~~powershell
node --version
npm --version
~~~

Expected: v22.14.0 and 11.16.0. If the shell is not activated, use the pinned npm CLI command shown above for every Node-based check.

- [ ] **Step 2: Run focused editor tests again after the documentation commit.**

~~~powershell
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" test -- --run src/components/editor/Toolbar.test.tsx src/components/editor/PropertiesPanel.test.tsx src/components/editor/AnnotationLayer.test.tsx src/pages/Editor.test.tsx
~~~

Expected: all focused tests pass.

- [ ] **Step 3: Run the full test suite once.**

~~~powershell
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" test -- --run
~~~

Expected: all existing tests and the new regression tests pass. Do not add retries, skips, or threshold changes if a failure occurs; diagnose it.

- [ ] **Step 4: Run typecheck, lint, and production build.**

~~~powershell
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" run typecheck
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" run lint
fnm exec --using=22.14.0 -- node "$env:LOCALAPPDATA\node\corepack\v1\npm\11.16.0\bin\npm-cli.js" run build
~~~

Expected: typecheck, lint, and build exit 0. Existing warnings and bundle-size notices must be reported, not hidden.

- [ ] **Step 5: Check the final diff and evidence boundary.**

~~~powershell
git status --short --branch
git log --oneline --decorate -5
git diff --check 8f9f63b..HEAD
git diff --name-only 38c3f04^..HEAD
~~~

Expected: only the approved editor source/tests, onboarding/registry text, production inventory, and prior Phase 0 files are tracked. .superpowers/sdd/task-3-report.md is ignored and not in the tracked diff. No package.json, package-lock.json, dependency, or coverage-threshold changes are present.

- [ ] **Step 6: Hand the complete fix diff to an independent task reviewer.**

The reviewer must check the Important editor finding and both Minor findings against the approved design, inspect the full diff from the recorded base, and verify that no redaction activation/export path remains. Any Critical or Important finding must be fixed and re-reviewed before the branch is declared review-ready. This validation does not change the authoritative G0 result: the production-only npm audit remains failed with 20 findings (2 low, 6 moderate, 12 high).
