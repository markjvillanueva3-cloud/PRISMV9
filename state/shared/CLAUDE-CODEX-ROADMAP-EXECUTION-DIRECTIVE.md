# Claude/Codex Roadmap Execution Directive

## Status

Active until explicitly replaced.

## Purpose

This directive governs how Claude and Codex execute the PRISM roadmap across multiple terminals with proper coordination, claiming, and context survival.

## Canonical Roadmap Sources

Read these in order of authority:

1. `H:/prism/PRISM-UNIFIED-ROADMAP-v2.md` — Master roadmap (supreme authority)
2. `H:/prism/mcp-server/data/roadmap-index.json` — Task queue (532 milestones, 3065 units)
3. `H:/prism/state/shared/TASK_QUEUE.json` — Multi-agent coordination queue
4. `H:/prism/state/CURRENT_POSITION.md` — Current execution position

## Milestone Claiming Protocol

Before starting work on any milestone:

1. **Claim the milestone** to prevent collision:
   ```
   prism_orchestrate:roadmap_claim { milestone_id: "XXX-MSN" }
   ```

2. **Check existing claims** to avoid working on claimed milestones:
   - Read `roadmap-index.json` and check `claimed_by` fields
   - Milestones claimed by other terminals have `claimed_by` set
   - Claims older than 10 minutes without heartbeat are stale and can be reaped

3. **Heartbeat while working** to maintain your claim:
   ```
   prism_orchestrate:roadmap_heartbeat { milestone_id: "XXX-MSN" }
   ```

4. **Release on completion** or session end:
   ```
   prism_orchestrate:roadmap_release { milestone_id: "XXX-MSN" }
   ```

## Unit Execution Protocol

For each unit within a claimed milestone:

1. **Get next batch** of units to execute:
   ```
   prism_orchestrate:roadmap_next_batch { milestone_id: "XXX-MSN", batch_size: 5 }
   ```

2. **Execute each unit** following the RGS pipeline principles

3. **Mark unit complete** when done:
   ```
   prism_orchestrate:roadmap_unit_complete { milestone_id: "XXX-MSN", unit_id: "U-XXX-NNN" }
   ```

4. **Commit after each unit** with format: `LAYER-PHASE-UNIT: title — summary`

## Multi-Terminal Coordination

When multiple terminals are active:

- Each terminal should claim different milestones
- Use `TASK_QUEUE.json` for dependency-aware task selection
- Check `AGENT_COORDINATION_STATUS.md` for other active terminals
- Do NOT work on milestones claimed by other terminals

### Sync Bridge

Keep TASK_QUEUE.json synchronized with roadmap-index.json:

```powershell
node H:\prism\.claude\helpers\sync-roadmap-queue.mjs
```

## Compaction Survival

On context compaction, these systems preserve your state:

1. **PreCompact hook** writes:
   - Per-agent handoff to `state/shared/handoffs/HANDOFF-{instance}.md`
   - RESUME directive with your claimed milestone

2. **PostCompact/SessionStart** reads:
   - `.compaction-survival.md` for session state
   - Your terminal's handoff file (matched by hostname + PID)
   - Roadmap progress and collision warnings

3. **RESUME directive** format:
   - If you have a claim: `CONTINUE YOUR CLAIMED MILESTONE: XXX-MSN`
   - Includes collision warning: `DO NOT work on: YYY-MSN (claimed by other terminals)`

## Gate Protocol

While the current gate is active:

- Finish current delivery before starting new roadmap milestones
- Claude stays backend-first, Codex stays frontend-first
- Use `/rgs-sync status` to check gate state

After gate is lifted:

- Claim next available milestone from TASK_QUEUE
- Execute units following this directive

## Available Milestones

To find available (unclaimed, unblocked) milestones:

```
prism_orchestrate:roadmap_available { limit: 5 }
```

Or use the task queue helper:

```powershell
node H:\prism\.claude\helpers\task-queue.mjs next
```

## Omega Target

User explicitly wants **Omega = 1.0** for ALL milestones. Not 0.75 — full 1.0.

## Related Directives

- `CLAUDE-CODEX-COORDINATION-DIRECTIVE.md` — Multi-agent coordination
- `CLAUDE-CODEX-RGS-SYNC-PROTOCOL.md` — Roadmap sync protocol
- `CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md` — Task queue operations
- `ROADMAP_COLLABORATION_STATE.md` — Current collaboration mode
