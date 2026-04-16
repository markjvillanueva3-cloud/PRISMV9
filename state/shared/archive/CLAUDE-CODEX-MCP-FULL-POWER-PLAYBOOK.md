# Claude/Codex MCP Full-Power Playbook

## Status

Active until explicitly replaced.

This playbook completes the Codex-incorporation audit and turns it into a shared operating target for both Claude and Codex.

It does not replace:

- `H:/prism/state/shared/CLAUDE-CODEX-MCP-DEVELOPMENT-DIRECTIVE.md`
- `H:/prism/state/shared/CLAUDE-CODEX-COMMAND-BRIDGE.md`
- `H:/prism/state/shared/CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md`

It operationalizes them.

## Purpose

Make Claude and Codex use the same PRISM MCP-server development system wherever runtime limits allow.

The target is not "similar style."

The target is one shared operating stack:

- same startup logic
- same roadmap and task-queue truth
- same command-pipeline interpretation
- same preference for shared `prism_dev` development surfaces
- same build/test/SVI/quality visibility
- same finish-first sequencing under the current roadmap gate

## Current Gate

The current collaboration mode remains:

- `finish-current-delivery-first`

This playbook must strengthen current execution, not open a new roadmap branch.

Priority order remains:

1. finish current main-path backend/frontend tasks
2. keep coordination state honest
3. increase MCP development parity between Claude and Codex
4. make more of the automation stack fire automatically

## Canonical Read Stack

On reconnect, startup, or when work drifts, both agents should ground themselves in this order:

1. `H:/prism/state/shared/CLAUDE-CODEX-MCP-DEVELOPMENT-DIRECTIVE.md`
2. `H:/prism/state/shared/CLAUDE-CODEX-MCP-FULL-UTILIZATION-DIRECTIVE.md`
3. `H:/prism/state/shared/CLAUDE-CODEX-MCP-FULL-POWER-PLAYBOOK.md`
4. `H:/prism/state/shared/CLAUDE-CODEX-COMMAND-BRIDGE.md`
5. `H:/prism/state/shared/CLAUDE-CODEX-COORDINATION-DIRECTIVE.md`
6. `H:/prism/state/shared/CLAUDE-CODEX-RGS-SYNC-PROTOCOL.md`
7. `H:/prism/state/shared/CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md`
8. `H:/prism/state/shared/ROADMAP_COLLABORATION_STATE.md`
9. `H:/prism/state/shared/AGENT_CHAT.md`
10. `H:/prism/state/shared/AGENT_WORKBOARD.md`
11. `H:/prism/state/shared/TASK_QUEUE.md`

## Full-Power Operating Stack

Both agents should treat PRISM as a layered operating system.

### Layer 1: Coordination Truth

Use shared coordination files first for cross-terminal truth:

- `AGENT_CHAT.md`
- `AGENT_WORKBOARD.md`
- `ROADMAP_COLLABORATION_STATE.md`
- `TASK_QUEUE.md`

### Layer 2: Startup Truth

Mirror the PRISM startup pipeline, not just a light reconnect check.

Minimum startup behavior:

1. read the shared directives and command bridge
2. reap the task queue and check next available task
3. run `/rgs-sync` status
4. inspect current coordination notes
5. prefer shared dev surfaces for boot/build/test/SVI when available
6. announce session readiness back into shared coordination

Claude gets much of this through hooks.
Codex must mirror it by rule until runtime parity exists.

### Layer 3: Smart Execution Posture

Apply `/smart` before meaningful work.

This means choosing:

- role
- complexity
- model tier
- effort level

based on the real task, not habit.

At minimum, both agents should classify whether the task is primarily:

- backend wiring
- frontend wiring
- provider convergence
- proof/test hardening
- automation hardening
- roadmap/coordination work

### Layer 4: Forge Discipline

Apply `/forge-triple` when the slice is a real capability build, not just a tiny bug fix.

For any new capability surface, the target output is:

1. implementation
2. callable or wired MCP/route/client surface
3. protective hook/guard/skill/test coverage so the capability compounds instead of decaying

### Layer 5: MCP Dev-Surface Preference

When shared state matters, prefer `prism_dev:*` or the matching `/api/v1/dev/*` route instead of ad hoc local interpretation.

Preferred examples:

- startup boot context:
  - `prism_dev:session_boot`
- build health:
  - `prism_dev:build`
- server structure:
  - `prism_dev:server_info`
- smoke inventory:
  - `prism_dev:test_smoke`
- stored test results:
  - `prism_dev:test_results`
- SVI and Psi:
  - `prism_dev:svi_read`
  - `prism_dev:svi_summary`
- automation quality:
  - `prism_dev:quality_score*`
  - `prism_dev:quality_dashboard*`
  - `prism_dev:auto_wiring_*`
  - `prism_dev:self_improvement_*`
  - `prism_dev:auto_fix_*`

The authoritative action inventory and helper expectations for this layer live in:

- `H:/prism/state/shared/CLAUDE-CODEX-MCP-FULL-UTILIZATION-DIRECTIVE.md`

Direct shell is still valid for implementation work.

The rule is:

- use MCP dev surfaces when they are the better shared source of truth
- use local tools when they are the better implementation tool

### Layer 6: Compact / Recovery Discipline

Both agents should preserve resume context instead of treating compaction as a reset.

Required behaviors:

- refresh task ownership / heartbeat when applicable
- preserve current, next, blockers, and convergence target
- write or consume handoff state
- re-enter through startup discipline after compaction

Claude already has strong hook-backed support.
Codex should mirror the same workflow manually/by rule until tighter runtime parity exists.

## Automatic-Firing Matrix

### Automatic Now For Claude

- session-start coordination sync
- coordination polling on prompt submit
- compact survival and restore
- background coordination daemon
- tool-level helper hooks
- subagent context injection

### Mirrored Now For Codex

- `/rgs-sync`
- shared task queue
- spawn awareness
- shared command-bridge interpretation
- startup / smart / forge-triple / compact mirroring by rule
- MCP dev-surface preference by rule

### Still Missing For True Cross-Agent Parity

- Codex-native hook runtime equivalent to Claude project hooks
- Codex-native automatic coordination polling
- Codex-native automatic session-start sync
- Codex-native automatic compact recovery hooks
- task queue freshness repair against already-landed work

## Finish-First Execution Rule

This playbook does not authorize side-quest drift.

If the current main-path task is blocked:

- report the blocker honestly
- continue only with non-conflicting work that reduces future convergence cost
- prefer parity, proof, wiring truth, and automation honesty over speculative expansion

## MCP Automation Rule

The moment new code enters PRISM, the long-term target is:

`detect -> classify -> register -> wire -> prove -> promote`

Until the full automation system is complete, both agents should still behave as if this lifecycle matters.

That means checking:

- route mount parity
- dispatcher registration
- schema presence
- provider-surface honesty
- proof/tests
- consumer visibility

before treating new work as complete.

## Shared Daily Operating Pattern

For both Claude and Codex, the default PRISM work loop should be:

1. startup / reconnect through the shared stack
2. task queue check
3. `/rgs-sync` status
4. choose posture with `/smart`
5. implement with shared MCP dev-surface awareness
6. validate with tests/build/proof
7. post coordination state
8. preserve compact/handoff state

During startup and after major work slices, both agents should also prefer:

- `position-sync.mjs`
- `svi-refresh.mjs`
- `agent-coordination.mjs post`
- `roadmap-sync.mjs sync`

as the shared minimum coordination heartbeat until Codex has hook parity.

## Immediate Adoption Target

Claude and Codex should both treat this playbook as the current shared answer to:

"How do we use the full power of the PRISM MCP-server while finishing the active roadmap work?"

Short answer:

- same shared startup logic
- same shared roadmap/task truth
- same command-pipeline discipline
- same preference for `prism_dev` when shared development truth matters
- same compaction/recovery expectations
- same finish-first sequencing

## Immediate Remaining Gaps

The highest-value remaining parity gaps are:

1. Codex hook/runtime parity with Claude project hooks
2. task-queue state drift versus already-landed main-path work
3. clearer shared wrapper surfaces around `prism_dev:*`
4. automatic adoption of quality/automation dashboards during normal work

Until those are closed, this playbook is the shared operating contract.
