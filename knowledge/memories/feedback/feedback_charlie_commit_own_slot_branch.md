---
name: feedback_charlie_commit_own_slot_branch
description: "RULE (charlie's domain): stage + commit charlie's work to its OWN NATO-named branch slot/charlie (in worktree H:/prism-slot-charlie), NOT the shared cad-fusion-live-ms0 / H:/prism tree. Operator directive 2026-06-11."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.418Z
aliases: feedback_charlie_commit_own_slot_branch
---


**RULE (operator directive 2026-06-11, charlie's domain):** charlie stages + commits its work to its OWN chat-slot NATO-named branch **`slot/charlie`** in the git tree, NOT the shared `cad-fusion-live-ms0` branch / shared `H:/prism` tree.

**Why:** per-slot branch isolation. Committing on the shared tree risks attribution loss + peer-commit absorption (the [[feedback_commit_to_slot_worktree]] hazard: multiple chats' commits fold into one on a shared branch). A dedicated `slot/charlie` branch keeps charlie's milestones independently reviewable + mergeable, and lets the operator see exactly what charlie shipped.

**How to apply:**
- charlie's branch is `slot/charlie`; it is checked out in the slot worktree **`H:/prism-slot-charlie`** (git blocks checking it out a 2nd time in `H:/prism`, so work IN the worktree).
- Stage + commit there: `git -C H:/prism-slot-charlie add <files> && git -C H:/prism-slot-charlie commit -m "[<SCOPE>]/U-ID (slot:charlie): title"`. OR run `/checkin-charlie` (Step 2c slot-worktree cutover) to bind the session to the worktree, then commit normally.
- Commit subject still `[SCOPE]/U-ID (slot:charlie): title` (the `[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` prefix was the SHARED-tree pattern; on `slot/charlie` it is not needed).
- The slot-worktree routing hooks (`worktree-commit-route` / `git-add-lane-guard` / `main-tree-write-block`) arm once `chat-slots.json[charlie].branch` starts with `slot/` -- they enforce this rule automatically.

**Note (this-session honesty):** this session committed on the shared `cad-fusion-live-ms0` with the `[MAIN]` prefix BEFORE this directive; going forward charlie commits land on `slot/charlie`. Related: [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]] (now superseded for charlie by this slot-branch rule) · CLAUDE.md SLOT-WORKTREE-ARCHITECTURE.
