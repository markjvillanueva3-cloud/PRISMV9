# Claude/Codex Task Queue Directive

## Status

Active until explicitly replaced.

## Purpose

This directive governs how Claude and Codex agents select and coordinate tasks from the shared task queue.

## Task Queue Files

The canonical task queue surfaces are:

1. `H:/prism/mcp-server/data/roadmap-index.json` — Master queue (532 milestones, 3065 units)
2. `H:/prism/state/shared/TASK_QUEUE.json` — Multi-agent coordination overlay
3. `H:/prism/state/shared/TASK_QUEUE.md` — Human-readable task list

## Task Selection Protocol

### 1. Dependency-Aware Selection

Always use the task queue helper for dependency-aware selection:

```powershell
node H:\prism\.claude\helpers\task-queue.mjs next
```

This returns the next task that:
- Has all dependencies satisfied
- Is not claimed by another agent
- Is within the agent's ownership boundary (per AGENT_BOUNDARY_DIRECTIVE)

### 2. Manual Selection

If manually selecting a task:

1. Check `roadmap-index.json` for `dependencies` array
2. Verify all dependencies have `status: "complete"`
3. Verify task is not `claimed_by` another agent
4. Verify task track matches your ownership boundary

### 3. Claiming Tasks

Before starting work:

```
prism_orchestrate:roadmap_claim { milestone_id: "XXX-MSN" }
```

This prevents other agents from working on the same task.

## Priority Order

When multiple tasks are available, prioritize:

1. **Blocking tasks** — Tasks that unblock other high-value work
2. **Safety-critical** — Tasks in SAFE, PHYS tracks
3. **Infrastructure** — Tasks in SYS, ORCH, HOOK tracks
4. **Feature work** — All other tracks

## Queue Sync

Keep the task queue synchronized:

```powershell
node H:\prism\.claude\helpers\sync-roadmap-queue.mjs
```

Run this periodically to ensure TASK_QUEUE.json matches roadmap-index.json status.

## Stale Task Detection

Tasks are considered stale if:

- `claimed_by` is set but `last_heartbeat` is older than 10 minutes
- Status is `in_progress` but no commits in 30 minutes

Stale tasks can be reaped and reassigned.

## Enforcement

This directive is enforced by:

- `claim-required.mjs` — Blocks work without claims
- `cross-terminal-conflict.mjs` — Detects concurrent work on same task
- `roadmap-completion-logger.mjs` — Tracks completion status

## Schema Version

Task queue entries follow the roadmapSchema.ts envelope format.
