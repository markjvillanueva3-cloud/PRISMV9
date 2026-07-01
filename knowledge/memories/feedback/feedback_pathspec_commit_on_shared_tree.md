---
name: feedback_pathspec_commit_on_shared_tree
description: "On the shared H:/prism tree, `git add <my-paths>` does NOT scope the commit — `git commit` commits the WHOLE index and absorbs any peer's pre-staged files (H8 misattribution). Always `git commit -- <my-paths>`."
type: feedback
source: prism-memory
synced: 2026-06-02T16:27:19.658Z
aliases: feedback_pathspec_commit_on_shared_tree
---


On the shared `H:/prism` tree (where the fleet commits `[MAIN] [BOOTSTRAP-SLOT-ENFORCE]`
together), `git add <my-paths>` stages YOUR files but does **not** scope the commit.
`git commit -m "..."` then commits the **entire index** — including any file a peer
slot left **pre-staged** in the shared index. That peer file rides into your commit
under your subject = H8 misattribution.

**Observed 2026-06-02 (slot:sierra):** `git add scripts/lib/system-viz-graph.mjs <test>`
then `git commit` produced "3 files changed" — it swept in slot:papa's pre-staged
`mcp-server/src/tools/dispatchers/devDispatcher.ts` (papa's WIRE-UNWIRED work) under
sierra's `U-SV-FINDCACHE-IDEMPOTENT` subject.

**Why:** git's index is shared across all worktrees that share a `.git` AND across all
processes operating on one tree. `git commit` with no pathspec = commit everything staged.

**How to apply:**
1. **Always pathspec the COMMIT, not just the add, on the shared tree:**
   `git commit -m "..." -- <my-path-1> <my-path-2>` — commits ONLY those paths
   regardless of what else is staged. This is the band-aid.
2. **The real fix is the slot worktree** (`H:/prism-slot-<nato>`) — it has its OWN index,
   so a peer's staging can never leak into your commit. See [[feedback_commit_to_slot_worktree]].
3. **Do NOT `git reset --soft HEAD~1` to un-absorb on the shared tree** unless you re-verify
   HEAD is still yours AND recommit within the same breath — a peer can commit on top in the
   window (2026-06-02: slot:hotel committed during sierra's reset, orphaning sierra's commit;
   recovered by re-committing the still-staged files via pathspec). Prefer pathspec-on-commit
   up front so you never need the reset.
4. Always verify post-commit: `git show --stat HEAD` — if the file count exceeds what you
   touched, you absorbed a peer (R12 — check, don't assume).

Sibling lessons: [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]].


## Related
[[skills/prism|/prism]] • [[skills/lib|/lib]] • [[skills/system-viz-graph|/system-viz-graph]] • [[skills/src|/src]] • [[skills/tools|/tools]] • [[skills/dispatchers|/dispatchers]] • [[skills/dev|/dev]] • [[skills/prism-slot-|/prism-slot-]]