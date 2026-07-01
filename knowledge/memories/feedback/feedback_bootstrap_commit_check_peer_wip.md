---
name: feedback_bootstrap_commit_check_peer_wip
description: "When committing to the shared main tree from a slot via [BOOTSTRAP-SLOT-ENFORCE], FIRST `git diff` the exact target paths for pre-existing uncommitted PEER work — a broad `git add <glob>` absorbs peers' uncommitted WIP into YOUR commit (H8 misattribution). Stage only your own files; and beware shell globs expand against cwd, not the -C repo."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.404Z
aliases: feedback_bootstrap_commit_check_peer_wip
---


# Bootstrap-committing to main absorbs peer WIP — check `git diff` first

**Rule:** the `slot-commit-enforce` hook blocks slot chats from committing to the shared main tree precisely because *"commits from there get peer-absorbed into other slots' subjects ([[reference_h8_misattribution_2026_05_20|H8 misattribution]])."* When you legitimately override it with `[BOOTSTRAP-SLOT-ENFORCE]` (operator-directed fleet-wide apply, or a file that only exists in main), the H8 risk is REAL and you own mitigating it:

1. **`git -C H:/prism diff --stat -- <your exact target paths>` BEFORE staging.** Any file showing changes you didn't make = pre-existing uncommitted peer WIP. A pure-append task showing **deletions** in the commit is the tell.
2. **Stage only your own files** (the clean ones), or only your own hunks. `git add <broad-glob>` stages each file's ENTIRE working-tree delta vs HEAD — including a peer's uncommitted rewrite — and folds it under your commit subject. Peer work isn't lost (it's committed), but it's mis-attributed + possibly committed before the owner was ready.
3. **Shell globs expand against cwd, NOT the `-C` repo.** `git -C H:/prism add "engines/*/MEMORY.md"` run from a slot worktree: an UNquoted glob expands against the slot cwd (which may hold only 1 of N files) → you silently commit 1 instead of 34. QUOTE the glob so git expands it relative to its `-C` root. Verify with `git -C <repo> diff --cached --name-only | wc -l` before committing.

**Why:** verified 2026-06-02 (slot alpha, U-APPLY-ALL-GALAXIES). Applying a doctrine pointer to all 34 galaxy `MEMORY.md` brains: (a) the first commit's unquoted glob expanded against the slot cwd → only 1 brain committed (caught by the 3-vs-36 staged count); (b) the re-commit's `git add "engines/*/MEMORY.md"` absorbed 4 peers' uncommitted brain edits (business's stub→full rewrite by hotel + 3 minor) into commit `9368cf96f1` — 56 deletions in a pure-append commit was the tell. No data loss; the peer content is committed + correct, just co-attributed.

**How to apply:** before any bootstrap commit to main — `git -C H:/prism status --short -- <targets>` to see foreign WIP; stage clean files explicitly; quote globs; check `--cached` count matches your intent. When foreign WIP is unavoidable (it's interleaved in a file you must touch), note the co-attribution in the commit body + a chat-bus ping to the owner.

Related: [[reference_shared_tree_git_lock_contention_2026_06_02]] · [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]] · [[feedback_patch_sibling_queue_strategy]].
