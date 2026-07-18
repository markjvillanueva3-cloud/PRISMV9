---
source: project
section: STRATEGIC PLANNING — plan, don't pounce
slug: strategic-planning-plan-don-t-pounce
indexed_at: 2026-04-30T17:01:39.542Z
---

## STRATEGIC PLANNING — plan, don't pounce

**Plan-first triggers** (any one ⇒ stop and plan):
- ≥3 files / ≥2 engines / ≥5 tool calls / wiring to multiple dispatchers / ambiguous scope.
Use `EnterPlanMode`, `superpowers:writing-plans`, or `goal-planner` agent. Persist non-trivial plans to `state/shared/plans/PLAN-<topic>.md`.

**Decomposition:** `TaskCreate` for ≥3 dependent steps; `prism_atcs:task_init` for milestone-scoped multi-session work; inline plan only for single-file/single-action work. Each task ≤90 min — decompose larger.

**Critical path:** plan with ≥4 tasks + `blockedBy` → `prism_dev:critical_path`. Before claiming roadmap units → `prism_dev:roadmap_dag_descendants`. Re-run on any replan.

**Parallelization test:** subtasks have disjoint files, no shared blockers, independent tests → N parallel, not 1 sequential. Spawn `forge-team` or fork worktrees. Never serialize independent work.

**Anti-pattern:** first tool call is an Edit. First call should be a read, plan, or dependency query.
