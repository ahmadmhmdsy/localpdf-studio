---
description: Add a new tool through the catalog and registry, starting disabled
argument-hint: <tool-id> "<Tool name>" <category>
---

Add a new LocalPDF Studio tool: $ARGUMENTS

Follow `CLAUDE.md` §6a (no hardcoding). Check `docs/roadmap.md` for the milestone that owns this tool, and use its ID in the branch name. Before writing code, read one similar existing tool end to end (page, lib, tests) and copy its structure.

1. **Registry.** Add the ID to the `ToolId` union, and add an entry to `REGISTRY` in `src/config/featureRegistry.ts`, with `releaseState: 'disabled'`, the right privacy class, and honest `support` and `limitation` text. New tools always start disabled.
2. **Catalog.** Add the tool to its category in `src/constants/tools.ts`, with a description in your own words. Don't copy a competitor's wording.
3. **Inventory.** Add a row to `docs/release/production-inventory.md` that matches the registry.
4. **Logic.** Put processing in `src/lib/<tool>.ts`. Take limits from `src/constants/limits.ts`, support cancellation, and load heavy libraries with dynamic imports.
5. **Page.** Create `src/pages/tools/<Tool>.tsx` from the shared components in `src/components/tools/` (ToolLayout, FileUploadZone, ProcessingState, DownloadState).
6. **Route.** Add a `lazy()` import and a `ToolRoute` in `src/App.tsx`. Routes are still listed by hand there (roadmap backlog #15).
7. **Tests.** Add unit tests for the lib module and the page, alongside the source. Use `renderWithProviders()`.
8. **Checks.** Run `npm run typecheck`, `npm run lint`, `npx vitest run <new test files>` and `npx tsx scripts/validate-feature-registry.ts`. Report each as PASS / FAIL / SKIPPED.
9. **Review.** Run the `hardcoding-reviewer` and `i18n-rtl-checker` subagents on the diff.

Don't enable the tool. Use `/release-flip` later, which needs the owner's OK.
