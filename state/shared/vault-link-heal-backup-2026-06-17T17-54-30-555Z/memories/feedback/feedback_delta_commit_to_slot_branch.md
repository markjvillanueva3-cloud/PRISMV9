---
name: feedback_delta_commit_to_slot_branch
description: Delta (CAD) stages + commits to its OWN slot/delta branch from the H:/prism-slot-delta worktree — NEVER the shared H:/prism trunk. Separate index lock = zero fleet contention.
type: feedback
slot: delta
galaxy: cad
source: prism-memory
synced: 2026-06-17T17:52:52.142Z
aliases: feedback_delta_commit_to_slot_branch
---


**Rule (operator directive 2026-06-10):** Delta commits to its own NATO-named branch **`slot/delta`** from the slot worktree **`H:/prism-slot-delta`** — NOT the shared `H:/prism` trunk (`cad-fusion-live-ms0`). This is the per-slot specialization of the fleet doctrine [[commit-to-slot-worktree]] + [[reference-slot-commit-worktree-enforce-2026-05-24]].

**Why:** the slot worktree has its OWN git index + lock — `.git/worktrees/prism-slot-delta/index(.lock)` — distinct from the main tree's `.git/index(.lock)`. So:
1. **No fleet contention.** Committing in `H:/prism` fights every other chat for the shared `.git/index.lock`. On 2026-06-10 (session 0e708167) I committed 4 units to the trunk and hit sustained lock contention — 17+ failed attempts across iters, peers (tango/charlie/zulu) holding the lock for minutes. Committing in `H:/prism-slot-delta` would have had a private lock = zero waiting.
2. **No absorption.** When chats share `H:/prism`, the first to land a commit can absorb peers' concurrently-staged files under its subject (attribution loss — see [[commit-to-slot-worktree]]).
3. **Slot ownership.** `H:/prism` is the integrator's (golf's) territory; slot branches merge to trunk via the coordinated P1 merge ([[reference_delta_context_ledger_2026_06_10]] → DELTA-P1-MERGE-PLAYBOOK).

**How to apply:**
```bash
# ALWAYS commit from the slot worktree, scoped add (the worktree has ~42K untracked noise — never `git add .`):
git -C H:/prism-slot-delta add <specific-file> [<specific-file> ...]
git -C H:/prism-slot-delta commit -m "[delta] [SCOPE]/U-ID: title"   # [delta] prefix, NOT [MAIN]
```
Edit files under `H:/prism-slot-delta/...` (the slot worktree) so the change lands on `slot/delta`. The `main-tree-write-block` + `git-add-lane-guard` + `worktree-commit-route` hooks arm to enforce this once bound to `slot/delta`. The branch later merges to `cad-fusion-live-ms0` via the coordinated P1 merge — do NOT commit delta work directly to trunk to "save a merge"; that re-creates the contention + absorption this rule kills.
