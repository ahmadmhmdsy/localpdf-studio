# Task 8.1 — Workspace hygiene (no-op for TASK-28 branch)

## Status: no-op

Task 8.1's plan-listed files (AUDIT_REPORT.md, CLAUDE.md, PRD agent.md, backup_1.zip, vision to text.md) are all in the **master worktree** (`E:\js_projects\localpdf-studio`), not in the TASK-28 worktree.

The TASK-28 worktree was branched from master HEAD `1b09fc4`, which predates these files being created in the working directory (they were never committed, just untracked). They are simply absent from the worktree.

## Decision

Do not touch master. Task 8.1 is a separate concern from TASK-28 and should be done as its own commit when the user wants master cleanup. Doing it now would mix TASK-28 scope with master housekeeping.

## Recommended follow-up

After TASK-28 is merged to master, the master cleanup can be done as a small chore commit:

```bash
# In master worktree:
mkdir -p docs/audits docs/agent-guides docs/specs
git mv AUDIT_REPORT.md docs/audits/2026-07-19.md
git mv CLAUDE.md docs/agent-guides/CLAUDE.md
git mv "Product Requirements Document (PRD) agent.md" docs/specs/PRD.md
git mv skills_guide&roadmap.md docs/agent-guides/skills-roadmap.md
git rm backup_1.zip "vision to text.md"  # backup_1.zip was never committed; use rm not git mv
git commit -m "chore: relocate untracked reference docs into docs/, remove stray backup"
```

But: only do this AFTER TASK-28 is fully merged and the user has authorized master-only work.
