---
description: Check a tool for a releaseState change and stop for the owner's OK before flipping
argument-hint: <tool-id> <target-state>
---

Prepare a release-state change for: $ARGUMENTS

1. Run the `release-gate-checker` subagent on this tool and target state.
2. Report its results to the owner as PASS / FAIL / SKIPPED, with the blocking items.
3. **Stop and ask the owner** whether to flip. Don't edit `src/config/featureRegistry.ts` before an explicit yes in chat, even if every check passes.
4. Only after a yes:
   - change `releaseState` in `src/config/featureRegistry.ts`;
   - update the `support` and `limitation` text, the matching row in `docs/release/production-inventory.md`, and the catalog description in `src/constants/tools.ts` if it is no longer accurate;
   - update the tool's status row in `docs/roadmap.md`;
   - run `npx vitest run src/config` and `npx tsx scripts/validate-feature-registry.ts`;
   - commit the flip on its own, with the evidence in the commit message.
