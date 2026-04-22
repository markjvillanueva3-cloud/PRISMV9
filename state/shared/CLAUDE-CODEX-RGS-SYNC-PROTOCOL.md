# Claude/Codex `/rgs-sync` Protocol

## Status

Active until explicitly replaced.

## Purpose

`/rgs-sync` is the canonical shared roadmap-sequencing protocol for both Claude and Codex inside PRISM.

Use it when either agent needs to:

- check the current roadmap gate
- record backend/frontend convergence progress
- publish structured roadmap-lane status
- confirm whether a new large roadmap pass is allowed yet
- leave roadmap-quality notes without mixing them into normal chat traffic

## Canonical Surfaces

Read these together:

1. `H:/prism/state/shared/CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md`
2. `H:/prism/state/shared/ROADMAP_COLLABORATION_STATE.md`
3. `H:/prism/state/shared/AGENT_COORDINATION_STATUS.md`
4. `H:/prism/state/shared/AGENT_WORKBOARD.md`
5. `H:/prism/state/shared/FRONTEND_BACKEND_CONVERGENCE_PLAN_2026-03-27.md`

## Core Rule

Claude and Codex should treat `/rgs-sync` as a shared protocol, not a Claude-only slash alias.

- Claude may invoke the repo command macro directly.
- Codex should mirror the same behavior whenever the user types `/rgs-sync`.
- Both agents should use the same helper and the same response shape.

## Helper

Canonical helper:

`node H:\prism\.claude\helpers\roadmap-sync.mjs`

Supported commands:

- `status`
- `note`
- `sync`
- `set-mode`

## Preferred Usage

### `status`

Use for read-only alignment checks.

Expected response should include:

- collaboration mode
- whether the current backend/frontend finish-first gate is active
- whether a new large roadmap pass is allowed yet
- represented agent families and terminal instances
- latest structured sync snapshot for backend and frontend lanes
- the most important sequencing reminder

### `sync`

Use this instead of a freeform note when sharing active execution posture.

Recommended fields:

- `lane`
- `status`
- `current`
- `next`
- `done`
- `blockers`
- `needs`
- `convergence-target`

Example:

```powershell
node H:\prism\.claude\helpers\roadmap-sync.mjs sync --lane "frontend-current" --status "active" --current "Hot-job queue UX and desk convergence hardening" --next "Swap remaining provider seams to live payload states" --done "Shop-wide hot-job prioritization" --needs "Claude backend payload for hot-job flag fanout" --convergence-target "Jobs, shop-floor, and employee shell share one live hot-job source of truth"
```

### `note`

Use only for roadmap commentary that does not fit the structured sync shape.

### `set-mode`

Use only when changing the collaboration mode or gate posture, not for normal work updates.

## Field Semantics

- `lane`: the execution track, for example `frontend-current`, `backend-current`, `convergence`, or `audit-prep`
- `status`: short lifecycle label such as `active`, `blocked`, `ready-for-convergence`, or `stable`
- `current`: what this terminal is working on right now
- `next`: the next planned slice if current work completes cleanly
- `done`: most important recently completed slice
- `blockers`: direct blockers for this lane
- `needs`: what this lane needs from the other agent family
- `convergence-target`: what shared state or contract both sides are trying to meet

## Sequencing Rule

While the gate remains active:

- Claude stays backend-first
- Codex stays frontend-first
- `/rgs-sync` should reinforce convergence on the current tranche
- `/rgs-sync` should not open a new broad roadmap pass prematurely

After the gate is lifted:

- `/rgs-sync` becomes the coordination protocol for the next gap-closing, SVI-maximizing roadmap pass

## SVI Rule

Each meaningful `/rgs-sync` update should keep SVI/Psi in mind:

- what system surface is being completed
- whether that surface improves reachability or coverage
- whether any new engines, routes, scripts, hooks, indexes, or skills must be added so SVI does not drift behind reality

## Codex Mirror Rule

Codex should mirror `/rgs-sync` by:

1. reading this protocol when needed
2. running the canonical helper
3. summarizing the result in natural language
4. updating roadmap state through `sync`, `note`, or `set-mode` when the user explicitly asks or when a major roadmap slice completes

## Refresh Rule

If the command spec, helper, or registry changes, regenerate:

```powershell
node H:\prism\scripts\index\build-command-bridge.mjs
```
