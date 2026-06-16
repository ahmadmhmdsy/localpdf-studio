Part 1: Skill Selection Guide (Per Task Type)

This is the decision table your agent should internalize. For each task type, the agent reads the matching skill(s) BEFORE acting.



🧠 META-SKILLS (Always Load These First)

These are the "how to think" skills. Install them as permanent baseline context for any autonomous agent session.

SkillInstall CommandWhy It's Corewriting-plansnpx skills add obra/superpowers/writing-plansForces decomposition before any complex taskexecuting-plansnpx skills add obra/superpowers/executing-plansAdds checkpoints during execution, prevents free-runningverification-before-completionnpx skills add obra/superpowers/verification-before-completionForces a self-audit pass before marking anything donesystematic-debuggingnpx skills add obra/superpowers/systematic-debuggingReplaces random edits with a hypothesis-driven debug loopfind-skillsnpx skills add vercel-labs/skills/find-skillsAllows the agent to discover and install missing skills mid-session



Rule for your agent: Before starting any task that has more than 2 steps, read writing-plans. Before closing any task, read verification-before-completion.





🖥️ FRONTEND / UI TASKS

Trigger signals: "build a component", "create a page", "style this", "fix the UI", "refactor this interface"

PrioritySkillInstall CommandWhen to Use1stfrontend-designnpx skills add anthropics/skills/frontend-designAny new UI work — sets aesthetic direction and production patterns2ndweb-design-guidelinesnpx skills add vercel-labs/agent-skills/web-design-guidelinesFor correctness: spacing, typography, accessibility compliance3rdcritiquenpx skills add pbakaus/impeccable/critiqueWhen reviewing or improving existing UIOptionalpolishnpx skills add pbakaus/impeccable/polishFinal pass — tighten spacing, sharpen type, clean edgesOptionalextract-design-systemnpx skills add arvindrk/extract-design-system/extract-design-systemWhen working on an existing codebase with an established design system

Aesthetic operators (use one at a time, not all):

GoalSkillMake it bolder / stronger presencenpx skills add pbakaus/impeccable/bolderAdd micro-interactions / feel alivenpx skills add pbakaus/impeccable/delightStrip to essentials / reduce noisenpx skills add pbakaus/impeccable/distillCalm it down / less visual noisenpx skills add pbakaus/impeccable/quieter



⚛️ REACT / NEXT.JS TASKS

Trigger signals: "build a React component", "Next.js route", "server component", "app router", "Vercel deploy"

PrioritySkillInstall CommandWhen to Use1stReact topicnpx skills add vercel-labs/agent-skillsProduction React patterns, performance rules2ndvercel-composition-patternsnpx skills add vercel-labs/agent-skills/vercel-composition-patternsFlexible, scalable component architectureFor Next.jsNext.js topicnpx skills add vercel-labs/agent-skills (nextjs)App Router, caching APIs, server components



Pair with: frontend-design for any UI work within React/Next.js.





🗄️ DATABASE TASKS

Trigger signals: "query", "schema", "migration", "Supabase", "Postgres", "Firebase", "Neon", "Convex"

PrioritySkillInstall CommandWhen to Use1stDatabases topicnpx skills add (database skill for your DB)Correct queries, schema patterns, migrations



Browse: https://www.skills.sh/topic/databases — pick the skill matching your database (Postgres, Supabase, Firebase, Neon, or Convex).





Pair with: writing-plans before any migration task — migrations are irreversible.





📱 MOBILE TASKS

Trigger signals: "Expo", "React Native", "iOS", "Android", "mobile screen", "native"

PrioritySkillInstall CommandWhen to Use1stMobile topicnpx skills add (mobile skill)Expo, React Native, platform conventionsOptionalsleek-design-mobile-appsnpx skills add sleekdotdesign/agent-skills/sleek-design-mobile-appsMobile-first design principles



Browse: https://www.skills.sh/topic/mobile





🧪 TESTING TASKS

Trigger signals: "write tests", "fix failing test", "TDD", "Playwright", "coverage", "verify behavior"

PrioritySkillInstall CommandWhen to Use1sttest-driven-developmentnpx skills add obra/superpowers/test-driven-developmentWrite failing test first, then implement, then verify2ndTesting topicnpx skills add (testing skill)Playwright automation, meaningful test strategy



Browse: https://www.skills.sh/topic/testing





Pair with: verification-before-completion — never commit without a passing test run.





🔁 PARALLEL / COMPLEX MULTI-STEP TASKS

Trigger signals: "large feature", "build the whole thing", "autonomous", "work through the list", "refactor everything"

PrioritySkillInstall CommandWhen to Use1stsubagent-driven-developmentnpx skills add obra/superpowers/subagent-driven-developmentOrchestrate specialized subagents per workstream2nddispatching-parallel-agentsnpx skills add obra/superpowers/dispatching-parallel-agentsSplit independent work across parallel agents3rdusing-git-worktreesnpx skills add obra/superpowers/using-git-worktreesRun parallel agent sessions on separate branchesFor PRD listsralph-tui-prdnpx skills add subsy/ralph-tui/ralph-tui-prdGenerate structured task list for autonomous loop



🌐 BROWSER AUTOMATION TASKS

Trigger signals: "scrape", "fill form", "automate browser", "extract data from site", "screenshot", "navigate"

| Option A | agent-browser | npx skills add vercel-labs/agent-browser/agent-browser | Fast, CLI-driven, reliable for structured automation |

| Option B | browser-use | npx skills add browser-use/browser-use/browser-use | Visual page understanding — interacts based on what it SEES |



Rule: Use agent-browser for predictable, structured pages. Use browser-use when the page structure is inconsistent or unknown.





📝 DOCUMENT / CONTENT TASKS (Local Skills — Claude.ai)

These are the local skills already available in your Claude.ai environment:

TaskLocal SkillTriggerCreate / edit Word documentdocx/mnt/skills/public/docx/SKILL.mdCreate / read / fill PDFpdf/mnt/skills/public/pdf/SKILL.mdCreate / edit PowerPointpptx/mnt/skills/public/pptx/SKILL.mdCreate / edit Excel/spreadsheetxlsx/mnt/skills/public/xlsx/SKILL.mdFrontend UI/componentfrontend-design/mnt/skills/public/frontend-design/SKILL.mdRead/parse any uploaded filefile-reading/mnt/skills/public/file-reading/SKILL.mdRead PDF specificallypdf-reading/mnt/skills/public/pdf-reading/SKILL.md



Rule for your agent: Before creating any file or writing any code, scan this list. If a local skill matches, read it FIRST. No exceptions.





🔧 SKILL CREATION / META TASKS

Trigger signals: "create a new skill", "improve this skill", "write a SKILL.md", "benchmark skill performance"

SkillInstall CommandWhen to Useskill-creatornpx skills add anthropics/skills/skill-creatorCreate, test, and publish new skills from within your agentbrainstormingnpx skills add obra/superpowers/brainstormingStructured ideation before designing a new skill or system



Part 2: Project Roadmap — Optimal Skill Stack Per Phase

This is the build timeline. At each project phase, the agent loads the skills appropriate to that phase.



PHASE 0 — Project Setup \& Planning

Goal: Understand requirements, decompose the project, define architecture.

Load:



brainstorming — structured ideation and problem decomposition

writing-plans — turn the goal into a concrete implementation sequence

find-skills — discover any domain skills you'll need before starting



Output: A PLAN.md with ordered tasks, dependencies, and acceptance criteria per task.



PHASE 1 — Architecture \& Schema Design

Goal: Define data models, API contracts, folder structure.

Load:



writing-plans (already loaded)

Database skill matching your stack (Postgres / Supabase / etc.)

verification-before-completion — verify schema before any migrations run



Rule: No migration runs until schema is reviewed. No code starts until architecture is documented.



PHASE 2 — Backend / API Development

Goal: Implement server logic, API routes, data access layer.

Load:



executing-plans — follow the Phase 0 plan with checkpoints

systematic-debugging — when anything breaks, follow hypothesis→test loop

test-driven-development — write tests before implementation

Database skill (still loaded)



Rule: Each route/function must have a passing test before moving to the next.



PHASE 3 — Frontend Development

Goal: Build UI components, pages, and interactions.

Load:



frontend-design — aesthetic direction and production patterns

web-design-guidelines — correctness (spacing, type, accessibility)

React / Next.js skill (if applicable)

executing-plans (still loaded)



Rule: Read extract-design-system if joining an existing codebase before writing any new components.



PHASE 4 — UI Polish \& Refinement

Goal: Improve visual quality, fix rough edges, accessibility pass.

Load:



critique — identify specific visual problems with line-level specificity

One aesthetic operator only: polish, bolder, distill, or quieter — pick based on goal

Testing skill for Playwright E2E coverage of UI flows



Rule: Critique before fix. Never jump straight to polish without a critique pass.



PHASE 5 — Testing \& Verification

Goal: Full test coverage, regression checks, performance baseline.

Load:



test-driven-development

Testing topic skill (Playwright, coverage)

verification-before-completion — hard gate before any PR



Rule: No branch is mergeable without this phase completing.



PHASE 6 — Parallel / Scale Work

Goal: Speed up large features by distributing work.

Load:



subagent-driven-development — orchestrate specialized agents

dispatching-parallel-agents — split independent workstreams

using-git-worktrees — each subagent works on its own branch

ralph-tui-prd — generate a structured task list for autonomous loop



Rule: Work is only parallelizable when tasks have no shared state. Always define the dependency graph first.



PHASE 7 — Code Review \& Branch Close

Goal: Self-review, PR description, request review.

Load:



requesting-code-review — self-review checklist, test coverage, PR description

finishing-a-development-branch — branch close checklist: tests, commit, PR, review request



Output: A PR with passing tests, a clear description, and a review request. No exceptions.



Part 3: Agent System Prompt Template

Copy this into your OpenCode / Hermes agent system prompt to activate skill-aware behavior:

You are an autonomous agent. Before starting ANY task:



1\. IDENTIFY the task type (frontend, backend, database, testing, browser automation, planning, debugging, parallel work, document creation).



2\. READ the matching skill(s) from this priority list:

&#x20;  - Complex/multi-step task → read writing-plans first

&#x20;  - Debugging → read systematic-debugging before making any edits

&#x20;  - UI/frontend work → read frontend-design, then web-design-guidelines

&#x20;  - Any file creation (docx/pdf/pptx/xlsx) → read the local skill at /mnt/skills/public/<type>/SKILL.md FIRST

&#x20;  - Testing → read test-driven-development before writing any implementation

&#x20;  - Before marking ANYTHING done → read verification-before-completion



3\. If you need a skill that isn't installed, use find-skills to locate and install it mid-session.



4\. For tasks with more than 3 steps, always write a plan in writing-plans format before executing.



5\. Never mark a task complete without a verification pass.



Quick Reference Card

TASK TYPE          → SKILL(S) TO LOAD

─────────────────────────────────────────────────────

Any complex task   → writing-plans + executing-plans

UI/component       → frontend-design + web-design-guidelines

UI polish          → critique → \[polish | bolder | distill | quieter]

React/Next.js      → React/Next.js topic + frontend-design

Database work      → Database topic skill (match your DB)

Debugging          → systematic-debugging

Testing            → test-driven-development + testing topic

Browser automation → agent-browser (structured) | browser-use (visual)

Parallel work      → subagent-driven-development + dispatching-parallel-agents

PRD/autonomous     → ralph-tui-prd + executing-plans

Branch close       → requesting-code-review + finishing-a-development-branch

Before any done    → verification-before-completion

Missing skill?     → find-skills



LOCAL FILE SKILLS (Claude.ai)

Word doc    → /mnt/skills/public/docx/SKILL.md

PDF         → /mnt/skills/public/pdf/SKILL.md

PowerPoint  → /mnt/skills/public/pptx/SKILL.md

Excel       → /mnt/skills/public/xlsx/SKILL.md

Frontend    → /mnt/skills/public/frontend-design/SKILL.md

File read   → /mnt/skills/public/file-reading/SKILL.md



Maintenance Checklist (Run Monthly)



&#x20;Run npx skills audit or review installed skills list

&#x20;Check for updates to core workflow skills (writing-plans, executing-plans, verification-before-completion)

&#x20;Prune skills that haven't been triggered in 30 days

&#x20;Review any community skills for security updates at https://www.skills.sh/audits

&#x20;Update this guide if your stack has changed (new DB, new framework, etc.)

&#x20;Consider writing a custom skill for any pattern you've explained to the agent more than 3 times

