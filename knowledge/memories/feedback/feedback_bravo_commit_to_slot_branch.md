---
name: bravo-commit-to-slot-branch
description: Bravo (hermes-zulu domain) stages + commits to its OWN NATO slot branch slot/bravo in the slot worktree H:/prism-slot-bravo -- NOT the shared H:/prism / cad-fusion-live-ms0 tree. Operator directive 2026-06-11. Shared-tree committing hit chronic .git/index.lock contention + peer-absorption this session.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.414Z
aliases: feedback_bravo_commit_to_slot_branch
---


# Bravo commits to slot/bravo (its own worktree), not the shared tree

## The rule (operator directive 2026-06-11)

Slot **bravo** (the hermes-zulu galaxy) stages and commits to its **own NATO-named slot branch `slot/bravo`** inside the slot worktree **`H:/prism-slot-bravo`** -- never to the shared `H:/prism` tree on `cad-fusion-live-ms0`. The integrator (**golf**) merges `slot/bravo` into `cad-fusion-live-ms0`. This is the bravo-domain instance of the fleet-wide rule [[commit-to-slot-worktree]].

## How to apply

```bash
# Work + commit in the slot worktree, on slot/bravo:
git -C H:/prism-slot-bravo add <your own files>
git -C H:/prism-slot-bravo commit -- <pathspec>   # pathspec form avoids peer-absorption
# Commit subject: [<slot>]/U-ID: title  (NOT the [MAIN] shared-tree prefix)
```

Write files into `H:/prism-slot-bravo/...` (your own worktree -- the `main-tree-write-block` + `worktree-commit-route` + `git-add-lane-guard` hooks arm once `chat-slots.json[bravo].branch` starts with `slot/`, which it does). For a harness-exec file (`.claude/hooks/*.mjs`, settings.json) that the cross-worktree hook hard-blocks, edit it in the slot worktree directly rather than the main tree.

## Why (concrete evidence, this session 2026-06-11)

Committing to the shared `cad-fusion-live-ms0` tree via `cd H:/prism && git commit` (with the `[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` bypass prefix) repeatedly hit the chronic shared-tree failure modes:
- **`.git/index.lock` contention** -- 2 separate commits this session failed with `Unable to create '.git/index.lock'`; both were stale 0-byte orphan locks (>60s old, from crashed peer git processes) that had to be manually cleared.
- **Peer-absorption** -- a bare `git add`/`git commit` on the shared tree sweeps every peer's concurrently-staged files into your commit (attribution lost; 3 absorbed in one golf session per [[commit-to-slot-worktree]]; 13 in a bravo session per the galaxy brain 2026-06-03 Finding #5).

The slot worktree has its own `.git` index (no cross-chat lock contention) and its own branch (no absorption). The `[MAIN]` shared-tree prefix ([[feedback_commit_prefix_main_on_shared_tree]]) is the deprecated fallback for bravo -- prefer the slot branch.

**Why this matters:** clean attribution + zero lock contention + the designed slot->golf integration flow. **How to apply:** always `git -C H:/prism-slot-bravo` with `-- <pathspec>`; reserve the shared tree for golf.
