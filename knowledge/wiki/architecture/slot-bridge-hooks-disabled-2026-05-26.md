---
title: Slot-Bridge Hooks Disabled — 2026-05-26
type: architecture-note
authored: 2026-05-26
authored_by: claude-625e0262 (slot:alpha)
status: live
supersedes_doctrine_in: feedback_commit_to_slot_worktree
---

# Slot-Bridge Hooks Disabled (2026-05-26)

Three slot-bridge enforcement hooks were dormant-bound to kill switches on
2026-05-26 per operator directive ("takeout the golf blocks thats keeping
chats from committing to their own work tree"). The hooks are NOT deleted —
their `.mjs` files remain on disk, retain their tests, and can be re-armed
by removing three environment variables.

## What was disabled

| Hook (.mjs) | Wired matcher | Kill switch added |
|---|---|---|
| `main-tree-write-block.mjs` | PreToolUse `Edit|Write|MultiEdit|NotebookEdit` | `PRISM_MAINTREE_WRITE_BLOCK_DISABLE=1` |
| `worktree-commit-route.mjs` | PreToolUse `Bash` (commit lane) | `PRISM_WORKTREE_ROUTE_DISABLE=1` |
| `git-add-lane-guard.mjs` | PreToolUse `Bash` (commit lane) | `PRISM_GIT_ADD_LANE_DISABLE=1` |

All three knobs live in `~/.claude/settings.json` `env` block. The
`c-to-h-mirror` hook auto-replicates the change to `H:/.claude/settings.json`
on save. The original `*_ENABLE=1` flags are now vestigial (per the
docstrings inside each hook: "ENABLE knob is preserved as a no-op for
back-compat; *_DISABLE=1 is the live kill switch").

## Why disabled

The three hooks were P3-DEFAULT-ON since 2026-05-16 and assumed every
armed slot has a corresponding `H:/prism-slot-<nato>` worktree on disk.
This assumption was violated on 2026-05-26:

- `git worktree list` showed only `H:/PRISM` (the shared main tree) and
  ephemeral `agent-*` worktrees. No `slot/<nato>` worktrees existed.
- `chat-slots.json` had `branch: slot/alpha` for alpha — the binding was
  there, but the worktree it referenced wasn't.
- Alpha had already shipped 11 commits to the `slot/alpha` branch
  (SLOT-BRIDGE-MS0 + COMBO-EFFICIENCY-MS0) from a session that briefly
  had the worktree, then it was removed.

Net effect on any non-golf chat working from `H:/PRISM`:

- `main-tree-write-block` rejected every `Edit/Write`
- `worktree-commit-route` rejected `git commit`
- `git-add-lane-guard` rejected `git add`

The chat could neither edit files nor commit them. The hooks had become
a fleet-wide commit-block, not the lane-discipline tool they were
designed to be.

## What still works

- **Slot binding metadata** — `chat-slots.json` still records
  `branch: slot/<nato>` per slot. `state/shared/slot-branch-bindings.json`
  still resolves to the same values. Only the runtime gate is silenced.
- **Golf integrator role** — `main-tree-write-block` always exempted golf
  (`INTEGRATOR_SLOT_NAME = "golf"`). Disabling these flags is a no-op for
  golf. Golf can still integrate slot branches into `cad-fusion-live-ms0`.
- **`commit-coordination-acquire`** — separate hook in the same Bash
  matcher block; multi-chat commit coordination is untouched.

## How to re-arm

```jsonc
// ~/.claude/settings.json env block:
"PRISM_WORKTREE_ROUTE_DISABLE": "0",     // or remove the line
"PRISM_GIT_ADD_LANE_DISABLE": "0",
"PRISM_MAINTREE_WRITE_BLOCK_DISABLE": "0",
```

The mirror hook will replicate to H: on next Edit/Write. The hooks will
arm on the next subprocess invocation (each hook reads `process.env` at
exec time).

## Pre-requisite for safe re-arm

Before re-arming, ensure every claimed slot in `chat-slots.json` actually
has a worktree on disk. Check via:

```bash
# List all worktrees
git -C H:/prism worktree list

# Compare against claimed slots
cat H:/prism/state/shared/chat-slots.json | grep -E '"slot"|"branch"'
```

For each non-golf slot with `branch: slot/<nato>` but no corresponding
worktree path on disk, either:
- Remove the slot claim, OR
- Create the missing worktree:
  ```bash
  git -C H:/prism worktree add ../prism-slot-<nato> -b slot/<nato>
  ```

## Doctrine cross-refs

- `feedback_slot_bridge_hooks_disabled` — full memory entry on this change
- `feedback_commit_to_slot_worktree` — original lane-discipline doctrine
  (still applies AT the slot worktree level; just no longer gate-enforced
  at the chat level)
- `feedback_never_delete_only_disable` — followed (env kill switch, not
  file deletion)
- `reference_slot_bridge_ms0_2026_05_26` — the milestone that armed these
  hooks; data model (bindings file) is unchanged
- `feedback_settings_wiring_drift_2026_05_16` — applies: settings.json
  changes silently revert across multi-chat fleets; this wiki entry exists
  partly to prevent silent re-arm
