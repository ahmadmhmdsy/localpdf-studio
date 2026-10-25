# Contributing to LocalPDF Studio

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/localpdf-studio.git`
3. Use Node 22.14.0 (`.nvmrc`) and npm 11.16.0; `AGENTS.md` shows the `fnm` and `corepack` commands
4. Install dependencies: `npm ci` (reproducible install from `package-lock.json`; don't use another package manager)
5. Optional: copy `.env.example` to `.env`. No API key is needed: the web build accepts none, and the desktop build takes a user-owned key from the app UI
6. Start dev server: `npm run dev`

## Development Workflow

1. Pick a milestone or backlog item in [`docs/roadmap.md`](docs/roadmap.md)
2. Create a branch named with its ID: `git checkout -b <milestone>/<description>` (e.g., `a2.2/compression-ui-check`, `b1/i18n-loader`); for unplanned fixes use `fix/<description>`
3. Make your changes. Follow the no-hardcoding rule in `CLAUDE.md` §6a
4. Run the same checks CI runs before pushing:
   ```sh
   npm run typecheck      # 0 errors
   npm run lint           # 0 errors (don't add new warnings)
   npm run test:coverage  # all pass, coverage thresholds met
   npm run build          # succeeds
   npm run check:bundle   # within budget
   npm run test:e2e       # Playwright smoke and axe tests pass
   ```
5. Commit using clear commit messages (e.g., `fix: prevent keyboard shortcuts from blocking screen readers`)
6. Push and open a Pull Request; the template asks for the roadmap ID

## Code Style

- **No hardcoding**: tools, limits, copy, styling and URLs come from the catalog, registry, constants, theme or env config (`CLAUDE.md` §6a)
- **Components**: Keep under ~500 lines; extract sub-components
- **State**: Use granular Zustand stores, not the deprecated `useEditor()` hook
- **Styling**: Use `cn()` from `src/lib/utils.ts` for conditional classes; use theme tokens and CSS variables, not hardcoded colors (`var(--bg)`, `var(--surface)`, etc.)
- **Accessibility**: All icon-only buttons need `aria-label`; maintain WCAG 2.1 AA
- **Languages**: English and Arabic (including RTL) come first
- **AI calls**: Use `withRetry()` from `src/lib/ai.ts` (3 attempts, exponential backoff)
- **Tests**: Test files live alongside source; use `renderWithProviders()` for component tests

## Project Structure

```
src/
├── components/   # Reusable UI components
├── config/       # Feature registry (release state, privacy class)
├── pages/        # Route components (31 tools + editor)
├── lib/          # Utility functions (pdf, ai, compress, etc.)
├── store/        # Zustand stores (document, tools, annotations, toast)
├── contexts/     # React contexts (Editor, Toast)
├── constants/    # Tool catalog, colors, limits
├── theme/        # Skins and theme tokens
├── hooks/        # Custom React hooks
└── tests/        # Test setup, utilities, fixtures
e2e/              # Playwright tests
src-tauri/        # Desktop (Tauri 2) shell
```

## Pull Request Process

1. Update the milestone's status row in `docs/roadmap.md`, and add any new issues you found to its backlog (§6.1)
2. Ensure all quality gates pass (the checks above; CI also runs Lighthouse, `cargo check` and `npm audit`)
3. Don't change a tool's `releaseState` in `src/config/featureRegistry.ts` without the maintainer's explicit approval; each flip goes in its own commit with its evidence
4. Ask before adding a dependency or changing the CSP or `Permissions-Policy`
5. PRs require at least one review before merging

## Questions?

Open an [issue](https://github.com/ahmadmhmdsy/localpdf-studio/issues) or check `AGENTS.md` for AI-assisted development guidance.
