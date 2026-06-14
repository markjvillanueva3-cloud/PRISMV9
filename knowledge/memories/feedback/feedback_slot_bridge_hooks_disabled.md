---
name: feedback-slot-bridge-hooks-disabled
description: 3 golf-named slot-bridge hooks disabled via kill switches — they blocked chats from committing to their actual working tree when slot worktrees don't exist
type: feedback
source: prism-memory
synced: 2026-05-26
---

# Slot-bridge hooks disabled — chats commit to their actual tree

**Date:** 2026-05-26 · **Slot:** alpha (`claude-625e0262`) · **Operator directive**

## What changed

Three kill switches added to `~/.claude/settings.json` `env` block (mirrored to H:):

```json
"PRISM_WORKTREE_ROUTE_DISABLE": "1",
"PRISM_GIT_ADD_LANE_DISABLE": "1",
"PRISM_MAINTREE_WRITE_BLOCK_DISABLE": "1"
```

The pre-existing `*_ENABLE: "1"` entries are now vestigial (per docstrings: "ENABLE
knob is preserved as a no-op for back-compat; *_DISABLE=1 is the live kill switch").

**Hook files preserved** on disk (`.claude/hooks/main-tree-write-block.mjs`,
`worktree-commit-route.mjs`, `git-add-lane-guard.mjs`) per
[[feedback_never_delete_only_disable]] — only the gate runtime is silenced.

## Why disabled

The slot-bridge enforcement model (SLOT-WORKTREE-MS0, SLOT-BRIDGE-MS0) assumed
every armed slot has a corresponding `H:/prism-slot-<nato>` worktree on disk.
When the worktree is missing (as observed 2026-05-26 — slot/alpha branch had
11 commits but no worktree existed), the three hooks create an impossible state:

- `main-tree-write-block` blocks Edit/Write into `H:/prism` (the only tree
  this chat actually has on disk)
- `worktree-commit-route` blocks `git commit` because the routed-to worktree
  doesn't exist
- `git-add-lane-guard` blocks `git add` because the staged path doesn't match
  the (non-existent) slot worktree

Net effect: the chat could neither edit files nor commit them. The hooks were
preventing chats from doing the work their slot was claimed to do.

## What still works

- **`golf` (integrator) was always exempt** — main-tree-write-block hard-codes
  `INTEGRATOR_SLOT = "golf"`. Disabling these flags has no effect on golf.
- **Slot-binding tracking** continues — `chat-slots.json` still records
  `branch: "slot/<nato>"` per slot, and bindings persist via
  `state/shared/slot-branch-bindings.json`. Only the WRITE-PATH enforcement
  is silenced; the metadata is intact.
- **`commit-coordination-acquire`** (separate hook, same Bash matcher block)
  is untouched and continues to coordinate multi-chat commits.

## Re-enable path

```bash
# Edit ~/.claude/settings.json: remove the three *_DISABLE lines OR set to "0".
# Mirror auto-replicates to H:/.claude/settings.json on next Edit/Write.
```

Reversal is fully safe — hook .mjs files were never modified.

## Doctrine touchpoints

- [[feedback_never_delete_only_disable]] — followed (env kill switch, not file deletion)
- [[feedback_commit_to_slot_worktree]] — superseded for chats without an actual slot worktree
- [[feedback_settings_wiring_drift_2026_05_16]] — applies: bumped C: settings.json, mirror landed H: same edit
- [[reference_slot_bridge_ms0_2026_05_26]] — the milestone these hooks armed; the data model (bindings file)
  remains, only the enforcement layer is dormant
- [[feedback_golf_owns_reaper]] — unrelated to commits; golf-integrator role unchanged
