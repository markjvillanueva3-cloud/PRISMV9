---
name: papa-commit-to-slot-branch
description: papa (backend-helper) stages + commits ALL its work to the slot/papa NATO-named branch in the git tree
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.439Z
aliases: feedback_papa_commit_to_slot_branch
---


Operator directive (2026-06-10, "good night" /yolo session): papa stages and commits ALL its work to its own chat-slot NATO-named branch — **`slot/papa`** — in the git tree. Never commit papa work straight to the shared/integration branch.

**Why:** The fleet runs up to 26 concurrent slot chats, each isolated on its own `slot/<nato>` worktree+branch (SLOT-WORKTREE-ARCHITECTURE). Committing papa work to `slot/papa` keeps each slot independently mergeable, prevents cross-slot commit collisions, and lets golf integrate slots deterministically. papa's worktree is `H:/prism-slot-papa`, checked out on branch `slot/papa`.

**How to apply:** Work inside the `H:/prism-slot-papa` worktree — `git add` + `git commit` then land on `slot/papa` automatically (worktree-commit-route + git-add-lane-guard hooks enforce the lane). Commit format `[SCOPE]/U-ID: title`. Shared-infra files that exist only on the integration branch (e.g. `scripts/lib/slot-galaxy-map.mjs`, the `backend-helper` galaxy-brain files) are NOT present on `slot/papa`; document the needed change as a patch-sibling / handoff note for golf integration rather than forking a divergent copy onto `slot/papa`. Related: [[feedback_papa_no_gates_full_pathways]], [[feedback_commit_prefix_main_on_shared_tree]], [[reference_slot_worktree_activation_2026_05_16]].
