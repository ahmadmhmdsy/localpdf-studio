# Contributing to LocalPDF Studio

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/localpdf-studio.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and add your Gemini API key
5. Start dev server: `npm run dev`

## Development Workflow

1. Create a branch: `git checkout -b type/description` (e.g., `fix/keyboard-shortcuts`, `feat/pdf-form-filler`)
2. Make your changes
3. Run quality checks before committing:
   ```sh
   npm run typecheck  # 0 errors
   npm run lint       # 0 errors
   npm test           # all pass
   npm run build      # succeeds
   ```
4. Commit using clear commit messages (e.g., `fix: prevent keyboard shortcuts from blocking screen readers`)
5. Push and open a Pull Request

## Code Style

- **Components**: Keep under ~500 lines; extract sub-components
- **State**: Use granular Zustand stores, not the deprecated `useEditor()` hook
- **Styling**: Use `cn()` from `src/lib/utils.ts` for conditional classes; prefer CSS variables over hardcoded Tailwind colors (`var(--bg)`, `var(--surface)`, etc.)
- **Accessibility**: All icon-only buttons need `aria-label`; maintain WCAG 2.1 AA
- **AI calls**: Use `withRetry()` from `src/lib/ai.ts` (3 attempts, exponential backoff)
- **Tests**: Test files live alongside source; use `renderWithProviders()` for component tests

## Project Structure

```
src/
├── components/   # Reusable UI components
├── pages/        # Route components (31 tools + editor)
├── lib/          # Utility functions (pdf, ai, compress, etc.)
├── store/        # Zustand stores (document, tools, annotations, toast)
├── contexts/     # React contexts (Editor, Toast)
├── constants/    # Tool definitions, colors, limits
├── hooks/        # Custom React hooks
└── tests/        # Test setup, utilities, fixtures
```

## Pull Request Process

1. Update `PLANNING.md` and `TASK.md` if your PR closes a task
2. Ensure all quality gates pass (typecheck, lint, test, build)
3. PRs require at least one review before merging

## Questions?

Open a [Discussion](https://github.com/your-org/localpdf-studio/discussions) or check `AGENTS.md` for AI-assisted development guidance.
