### Task 0.1: Bump `pdfjs-dist` to a fixed range

- [ ] **Step 1: Confirm the current vulnerable version**

Run: `npm ls pdfjs-dist`
Expected: `pdfjs-dist@5.5.207` (or compatible 5.x that satisfies `>=5.6.83 <6.2.108`).

- [ ] **Step 2: Bump the package**

Run: `npm install pdfjs-dist@^6.2.108 --save-exact=false`
Expected: `package.json` shows `"pdfjs-dist": "^6.2.108"` (or whatever semver range npm picks). Lockfile updates.

- [ ] **Step 3: Check the audit is clean**

Run: `npm audit`
Expected: `0 vulnerabilities`.

- [ ] **Step 4: Verify tests still pass**

Run: `npm test 2>&1 | tail -8`
Expected: `Test Files  76 passed (76) | Tests  558 passed (558)`.

- [ ] **Step 5: Verify build still passes**

Run: `npm run build 2>&1 | tail -5`
Expected: `✓ built in <N>s`. Watch for any worker URL resolution failure.

- [ ] **Step 6: Inspect `src/lib/pdfjs.ts` for breaking API changes**

Read `src/lib/pdfjs.ts`. Confirm `pdfjs-dist/build/pdf.worker.min.mjs?url` still resolves (Vite URL import — should be unaffected). If pdfjs 6 changed `GlobalWorkerOptions.workerSrc` semantics, follow the upstream migration note.

- [ ] **Step 7: Inspect `src/lib/image.ts` for breaking changes**

Read `src/lib/image.ts`. Confirm `getDocument`, `page.render`, `page.getViewport` signatures unchanged. If pdfjs 6 changed return types (e.g. `Promise<PDFDocumentProxy>`), update the 4 affected tests in `src/lib/image.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json
git commit -m "fix(deps): bump pdfjs-dist to ^6.2.108 for GHSA-hq66-cqwq-w95j"
```

> **Rollback:** If pdfjs 6.x breaks the worker URL or the test fixtures, revert the bump and pin the workaround at `npm audit fix` minor bump (e.g. `5.6.83` → blocked) — escalate to user before downgrading.

---

## Phase 1 — TASK-27 PR 2 tail: strict `any` + `signature_pad` migration

Two independent items. Run as **Task 1.1** (mechanical, low risk) and **Task 1.2** (component swap, medium risk).

