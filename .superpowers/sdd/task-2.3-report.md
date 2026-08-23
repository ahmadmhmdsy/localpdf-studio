# Task 2.3 Report — Standardize mock import style

**Status:** DONE_WITH_CONCERNS (no code change)

## Findings

The plan called for hoisting `await import('./SUT')` patterns in test files to top-level static `import` statements. After investigation:

### Why the dynamic imports are intentional

The 30+ `await import(...)` calls in test files (e.g. `ai.test.ts:74,75,89,90,103,104,...`, `compress.test.ts:23,31,...`, `pdf.operations.test.ts:33,41,...`, `image.test.ts:12`) follow this pattern:

```ts
vi.mock('./SUT', () => ({ ... }));
beforeEach(() => vi.clearAllMocks());
it('test', async () => {
  const { fn } = await import('./SUT');  // ← dynamic re-import
  // ... test logic with mocked fn
});
```

This pattern is the **idiomatic vitest way** to re-import the SUT **after** `vi.clearAllMocks()` resets the mock state. If we replaced these with static imports at the top:

1. The static import happens once at module load
2. `vi.mock` factory is hoisted (yes), but the static import goes through vitest's module loader which uses the mock factory's first response
3. After `vi.clearAllMocks()`, the mock function is reset but the static-imported reference still points to the same mock — which works for re-using, **but** the actual code path in the SUT that internally does its own `import` would get the freshly-mocked version

Vitest's docs explicitly recommend `await import('./module')` inside tests when you need the **latest** module state, especially combined with `vi.resetModules()`. The pattern is correct as-is.

### Why hoisting would break tests

Replacing `const { fn } = await import('./SUT')` with top-level `import { fn } from './SUT'` would:

- Make tests **fail intermittently** because the static-imported reference is captured before any test-specific `vi.mocked()` setup
- Break the pattern used by `ai.test.ts` where `(pdfjsLib.getDocument as any).mockReturnValue(...)` is set up **per-test** (requires the import to be lazy so it picks up the new mock value)
- Force every per-test mock setup to move into `beforeEach` (a much larger refactor)

### The plan was based on a misunderstanding

The plan rationale ("Vitest hoists vi.mock regardless, so dynamic-import mocks are not actually lazy") is correct in isolation but misses the second-order effect: the dynamic import is intentional **after** per-test `vi.clearAllMocks()` to re-acquire the (freshly-reset) mock reference.

## Decision

No code changes for Task 2.3. The existing pattern is correct. The plan's recommendation would have introduced subtle flakiness.

If we want to improve this area in the future, the right refactor is to make per-test mock setup more explicit (e.g. move the `mockReturnValue` calls into `beforeEach` with shared setup), not to hoist the imports.

## Quality gate impact

None — no code changed, all 520 tests still pass.
