# Claude/Codex Coordination Directive

## Status

Active until the user explicitly replaces this directive.

## Purpose

This is the canonical shared coordination rule for Claude and Codex while they work concurrently in PRISM.

The goal is to keep both agents aware of:

- what each agent is currently working on
- what each agent plans to do next
- what each agent recently completed
- any short chat-style notes or blockers that should be visible across sessions

## Shared Coordination Surfaces

The canonical shared surfaces are:

- `H:/prism/state/shared/TASK_QUEUE.json`
- `H:/prism/state/shared/TASK_QUEUE.md`
- `H:/prism/state/shared/TASK_COORDINATION_SPEC.md`
- `H:/prism/state/shared/AGENT_WORKBOARD.json`
- `H:/prism/state/shared/AGENT_WORKBOARD.md`
- `H:/prism/state/shared/AGENT_CHAT.jsonl`
- `H:/prism/state/shared/AGENT_CHAT.md`
- `H:/prism/state/shared/AGENT_COORDINATION_STATUS.json`
- `H:/prism/state/shared/AGENT_COORDINATION_STATUS.md`
- `H:/prism/state/shared/AGENT_CONFLICT_ARBITRATION.json`
- `H:/prism/state/shared/AGENT_CONFLICT_ARBITRATION.md`

## Core Rule

When an agent changes focus in a meaningful way, it should update the shared coordination surfaces.

Examples:

- starting a new major task
- changing lanes because of a blocker
- finishing a meaningful slice
- leaving a short note for the other agent

## Preferred Update Method

For dependency-ordered task assignment, use:

```powershell
node H:\prism\.claude\helpers\task-queue.mjs next
```

Use the workboard/chat helper for coordination updates around that task work:

Use the shared helper:

```powershell
node H:\prism\.claude\helpers\agent-coordination.mjs post --message "current: ... | next: ... | done: ... | status: ..."
```

The helper should auto-detect both `family` and per-terminal `instance` whenever possible so multiple Claude terminals and future multiple Codex terminals can coordinate concurrently without stomping each other.

Only pass `--agent-family` or `--agent-instance` when an explicit override is needed.

## `/chat` Rule

The shared `/chat` command should append a note to the shared chat room and, when structured fields are present, update the workboard too.

Claude may use a native slash-command macro when available. Codex should mirror the same behavior whenever the user types `/chat ...`, even though Codex does not have Claude's slash-command runtime.

Recommended message format:

`current: ... | next: ... | done: ... | status: ... | lane: ... | message text`

Any missing structured field is optional.

## Live Awareness Rule

The coordination watcher should stay active whenever PRISM sessions are active:

```powershell
node H:\prism\.claude\helpers\agent-coordination-daemon.mjs start
```

Claude sessions may auto-poll unseen updates through hooks. Codex should mirror the same behavior by consulting the shared workboard/chat before re-planning or whenever the user sends `/chat ...`.

For roadmap sequencing or roadmap-phase readiness, use `/rgs-sync ...` instead of mixing those decisions into normal chat traffic.

Canonical `/rgs-sync` protocol:

- `H:/prism/state/shared/CLAUDE-CODEX-RGS-SYNC-PROTOCOL.md`

## Spawned Agent Rule

Spawned agents should inherit the same shared operating context, not start from zero.

- Claude subagents should receive shared context through the `SubagentStart` hook.
- Codex spawned agents should use the shared Codex spawn-awareness rule and helper so they receive the same bundle before `spawn_agent`.
- The inherited bundle should include current position, handoff, SVI state, roadmap gate status, shared coordination state, MCP-development preference rules, and shared index/command-bridge awareness.

Recent spawned-agent completion activity is logged at:

- `H:/prism/state/shared/SUBAGENT_ACTIVITY.md`
- `H:/prism/state/shared/CLAUDE-CODEX-SPAWNED-AGENT-DIRECTIVE.md`

## Reconnect Rule

On reconnect or startup, read:

1. `H:/prism/state/shared/CLAUDE-CODEX-COORDINATION-DIRECTIVE.md`
2. `H:/prism/state/shared/CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md`
3. `H:/prism/state/shared/AGENT_COORDINATION_STATUS.md`
4. `H:/prism/state/shared/AGENT_WORKBOARD.md`
5. `H:/prism/state/shared/AGENT_CHAT.md`

## Ownership Rule

- Claude remains backend-first unless the user changes ownership.
- Codex remains frontend-first unless the user changes ownership.
- The workboard and chat room are not a substitute for ownership boundaries.
- They exist so both agents can stay synchronized without the user having to repeat context twice.

## Duplication Guard Protocol (ALL AGENTS)

Before creating ANY new asset (engine, algorithm, formula, hook, action):

**MANDATORY PRE-BUILD CHECK:**
```typescript
import { duplicationGuardEngine } from "mcp-server/src/engines/DuplicationGuardEngine.js";

const check = duplicationGuardEngine.checkBeforeCreating({
  assetType: "engine",  // engine | algorithm | formula | action | hook
  proposedName: "ProposedAssetName",
  keywords: ["relevant", "search", "terms"],
  description: "What this asset does"
});

if (!check.shouldProceed) {
  // STOP — use existing: check.matches[0].name
  // DO NOT create duplicate
}
```

**Cross-Session Synchronization:**
- Asset registry syncs across ALL Claude/Codex sessions
- Fuzzy matching catches renamed/similar assets (85% threshold)
- Current inventory: 1,559 engines, 499 formulas, 60+ algorithms, 4,296 actions, 112 hooks

**Before Extraction/Learning:**
- Check `data/video-learned/learning-registry.json` for already-processed documents
- Check `data/docs/extracted/` for already-extracted formulas
- Query `duplicationGuardEngine.searchExisting()` for similar prior work

**Violation Handling:**
- Duplicate creation is a protocol violation
- If accidentally created, immediately merge or delete the duplicate
- Update the registry after any asset creation: `duplicationGuardEngine.registerNewAsset()`

## Conflict Arbitration Rule

If Claude and Codex discover that they are both about to work the same unresolved shared blocker at the same time:

1. prefer the task queue and explicit ownership boundaries first
2. if the issue is still truly shared and unclaimed, post a short coordination note
3. for task-bound conflicts, resolve temporary priority with the shared task-queue challenge:

```powershell
node H:\prism\.claude\helpers\task-queue.mjs challenge --task "<task-id>" --move r
```

4. for non-task shared-blocker collisions, use the shared RPS helper:

```powershell
node H:\prism\.claude\helpers\rps-arbitration.mjs --issue "<issue>" --agent-a "<Claude instance>" --play-a r --agent-b "<Codex instance>" --play-b s
```

Rules:

- allowed plays are `r`, `p`, or `s`
- the winner gets temporary priority for that blocker
- the loser should move to adjacent non-conflicting work and leave a short note or `/rgs-sync` update
- arbitration is only for duplicate shared-blocker collisions
- arbitration does not override explicit user direction, an active queue claim, or family ownership on a non-shared task
- contested shared-file edits should use `file-lock`, `file-unlock`, and `file-locks` through `task-queue.mjs`
