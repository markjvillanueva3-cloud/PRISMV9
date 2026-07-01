---
name: feedback_sierra_commit_to_slot_branch
description: Sierra stages + commits ONLY to its own NATO-named branch slot/sierra in the H:/prism-slot-sierra worktree. Concrete path + the routing-hook gotchas hit live 2026-06-10.
type: feedback
slot: sierra
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:46.444Z
aliases: feedback_sierra_commit_to_slot_branch
---


# Sierra commits to its own slot branch (slot/sierra)

**Rule (operator directive 2026-06-10):** the sierra chat stages + commits to its OWN
chat-slot NATO-named branch — **`slot/sierra`**, in the worktree **`H:/prism-slot-sierra`** —
never to the shared `H:/prism` tree (which is on `cad-fusion-live-ms0`). This is the
per-slot extension of the fleet-wide [[feedback_commit_to_slot_worktree]] discipline.

**Why:** the slot worktree keeps sierra's milestones independently attributable + mergeable;
a shared-tree commit gets absorbed into a peer's commit (attribution lost). The graph + its
713MB sidecars live in `H:/prism`; sierra READS/queries the live graph there but EDITS source
+ COMMITS in `H:/prism-slot-sierra`.

**How to apply (the two gotchas hit live 2026-06-10):**
1. **Commit subject format:** use `[MAIN] [<SCOPE>]/U-ID (slot:sierra): title`. A leading
   `[slot:sierra]` bracket is MIS-PARSED by `worktree-commit-route` as scope `[slot` and
   routes to a stale `work/...` worktree — it blocks the commit. The `[MAIN]` prefix is the
   documented override and matches the convention recent slot/sierra commits already use
   (e.g. `d132015a0e`). The `(slot:sierra)` annotation records the slot.
2. **A blocked commit UNSTAGES the files** (per [[feedback_commit_prefix_main_on_shared_tree]]).
   After any routing/scrutiny block, re-`git add` the paths before retrying — `git commit`
   alone reports "no changes added to commit".

**Cwd note:** the Bash shell cwd resets to `H:/prism-slot-sierra` each call. `cd H:/prism &&`
runs in the MAIN tree (graph queries / live data). Default to the slot worktree for edits +
commits; cd to main only to query the live graph/sidecars.

Verified live this session: `cdd09899bd`, `f5573940c8` both landed on `slot/sierra` via the
`[MAIN] ... (slot:sierra)` format after the `[slot:...]` form was blocked + unstaged.

**Repeated directive:** the operator gave this same instruction 2026-06-04 (see
[[reference_slot_cutover_sync_2026_06_04]] — *"you should be staging and committing to your
own branch … commit to the chat slot you're attached to"*) and again 2026-06-10. This memory
is the standing-doctrine promotion of it.

Related: [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]] · [[reference_slot_worktree_activation_2026_05_16]] · [[feedback_conflict_fork_rule]] · [[reference_slot_cutover_sync_2026_06_04]]
