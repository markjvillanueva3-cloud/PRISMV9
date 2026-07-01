---
name: multi-chat-coordination
category: code-tribal
domain: backend-dev
tags: [multi-chat, slot-worktree, chat-bus, file-claim, distributed-coordination, ai-development]
last_updated: 2026-05-18
---

# Multi-Chat Coordination — 13 concurrent Claude sessions, one repo

PRISM runs up to 13 concurrent Claude chats: alpha..foxtrot + hotel..mike (12 work slots) + golf (hygiene). Without coordination, chats overwrite each other's edits, race for the same files, and ship contradictory commits. Five mechanisms compose into a working coordination layer.

## The five mechanisms

| Mechanism | Surface | Purpose |
|-----------|---------|---------|
| Slot worktrees | `H:/prism-slot-<name>/` on branch `slot/<name>` | Per-chat isolated tree; commits don't conflict on shared files |
| Slot-task claims | `state/shared/slot-task-claims.json` | Unit-level locks so two slots never race-build the same `MILESTONE::U-ID` |
| File-claim namespace | `mcp-server/data/claims/<file>/claim.json` | Per-file editing lock with chat-ID provenance |
| Chat bus | `state/shared/AGENT_CHAT.jsonl` | Async message channel for coordination announcements |
| Terminal-pin | `chat-slots.json[slot].terminalWindowId` | Slot stays bound across `/compact` in the same PowerShell window |

## Slot worktree — the structural rail

`H:/prism` is the main tree. Each slot has `H:/prism-slot-<name>/` on `slot/<name>` branch. Three hooks enforce isolation:

- `worktree-commit-route.mjs` — commits route to the slot worktree, not the main tree.
- `git-add-lane-guard.mjs` — case-insensitive path check; blocks `git add` for paths outside the slot's lane.
- `main-tree-write-block.mjs` — Edit/Write into `H:/prism` is blocked when the chat is on a `slot/<name>` branch.

Golf is the only slot exempt — it integrates slot branches into the merge branch.

**The cutover protocol** (`/checkin` Step 2c, per-chat gradual migration):

1. `/checkin-<slot>` claims the slot.
2. Migration walks the chat from main tree → slot worktree.
3. From then on, edits land in `H:/prism-slot-<name>/`.

## Slot-task claims — unit-level locks

Lane assignment in `atomic-roadmap.json` is advisory; per-slot-claims is the enforceable lock:

```bash
node H:/prism/.claude/helpers/slot-task-claim.mjs claim --slot alpha --unit "BACKEND-DEV-LOOP::U-TRIBAL-WIRE"
node H:/prism/.claude/helpers/slot-task-claim.mjs heartbeat --slot alpha
node H:/prism/.claude/helpers/slot-task-claim.mjs release --slot alpha --unit "..."  # or auto on commit
```

Forward-only phase: `claimed→building→testing→committing`. The `post-commit` hook auto-releases on `[SCOPE]/U-ID:` commit subjects. **`/pick-unit --slot S --chatId C` filters peer-claimed units** so two chats never see the same unit as available.

## File-claim namespace — peer-edit prevention

Before editing a file in the main tree (or any contended path), claim it:

```bash
prism_context:claim_file path/to/file.md
# … edits …
prism_context:release_file path/to/file.md
```

The `file-claim-guard` PreToolUse hook **blocks edits to peer-claimed files**. Claims expire after 30 minutes of inactivity. The 2026-05-15 `file-claim-namespace-bug` lesson: chat-ID namespace must be canonical (`claude-<8hex>`); namespace mismatch produced false-negatives where two chats both held the same claim. See [[feedback_file_claim_namespace_bug]].

## Chat bus — async coordination

```bash
prism_context:chat_post --message "claiming PER-SLOT-CLAIM-MS0 for slot bravo, ETA 2h"
prism_context:chat_read --since "2026-05-18T10:00:00Z"
```

Post BEFORE editing contended areas. Read at the start of every session and before any non-trivial change. The bus is JSONL; never overwrite, only append.

## Terminal-pin — survive `/compact`

`chat-slots.json` carries `terminalWindowId` (resolved via the 4-tier `terminal-window-id.mjs` cache). Same PowerShell window → same slot, even across `/compact`, `/clear`, fresh `claude` invocation. **10 windows = 10 deterministic slot bindings.**

The cache-hit auto-upgrade rail (2026-05-15) prevents tier-freezing on a transient wmic flake — every cache hit re-probes a higher tier if available.

## Conflict-fork rule (when you can't migrate)

If a routing hook blocks your commit AND another chat owns the same files in the shared `H:/prism` tree, do NOT fight for the same tree. The proper fix is the slot-worktree migration via `/checkin-<slot>`. As a one-off fallback:

```bash
git worktree add ../prism-<scope> -b work/<scope>
```

Keeps the milestone independently mergeable. See [[feedback_conflict_fork_rule]].

## Cross-PC fleet — 2 machines, 13+ slots

Slot IDs are NOT host-pinned. PC-A might run alpha+bravo+golf; PC-B might run charlie+delta+golf. The `fleet-reaper` MS2 `U-FR-S3` (2026-05-18) added a cross-PC host filter so PC-A's reaper doesn't iterate PC-B's slots — PID-reuse false-attribution prevented.

## The "stop-cross-tree-collision-advisory" Stop hook

T3 advisory hook (Stop[7]/36) emits a 1-per-4h migration hint when:
1. Chat is in the shared `H:/prism` tree
2. Critical files dirty
3. A sibling worktree matches the chat's topic

Lighter-touch than the `worktree-commit-route` hard block. Knob: `PRISM_CROSS_TREE_ADVISORY_DISABLE=1`.

## The "checkin args ARE the work order" rule (2026-05-16)

When a user types `/checkin-<slot> <task>`, the trailing text is the PRIMARY deliverable. Slot-bind is minimal preamble; the substantive work is what comes after. See [[feedback_checkin_args_are_primary_work_order]].

## Schema-bump cadence

`chat-slots.json` `schemaVersion` bumps ONLY when `SLOT_NAMES` changes or `SlotState` fields rename. Rebuild stale slot files on bump; never silently migrate. The 2026-05-16 expansion from 12→13 slots was a **non-bump** because the addition was backward-compatible (additive).

## Related

- [[karpathy-12-rule-discipline]] — R10 (checkpoint), R11 (match conventions)
- [[atomic-write-idempotency-patterns]] — shared-file mutation patterns
- CLAUDE.md §"PER-CHAT HANDOFF (7 CONCURRENT CHATS — 6 work + 1 hygiene)" — handoff naming
- CLAUDE.md §"SESSION CONTINUITY STACK" — terminal-pin + auto-resume + compact-boundary fix
- CLAUDE.md §"PER-SLOT-CLAIM-MS0" — unit-level lock store
