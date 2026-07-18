---
name: feedback_oscar_commit_to_slot_branch
description: oscar (SFC galaxy) stages + commits ONLY to its NATO slot branch slot/oscar in worktree H:/prism-slot-oscar -- never main/integration.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.438Z
aliases: feedback_oscar_commit_to_slot_branch
---


Oscar (Speed-Feed Calculator galaxy) does all git work on its **own chat-slot NATO-named
branch**: `slot/oscar`, in the slot worktree `H:/prism-slot-oscar`. Stage the specific files
of the unit and commit there; never commit to `main` or the integration branch
(`cad-fusion-live-ms0`) directly -- golf is the integrator that merges slot branches.

**Why:** the 26-slot fleet runs concurrently; each slot owning its own branch+worktree is how
PRISM keeps milestones independently mergeable and avoids cross-chat clobber. The slot-worktree
hooks (`worktree-commit-route`, `main-tree-write-block`, `git-add-lane-guard`) already enforce
this once `chat-slots.json[oscar].branch` starts with `slot/` -- this memory makes the
convention explicit so oscar never fights the routing. See [[reference_slot_worktree_activation_2026_05_16]].

**How to apply:**
1. Confirm lane: `git -C H:/prism-slot-oscar rev-parse --abbrev-ref HEAD` -> must be `slot/oscar`.
2. Stage ONLY this unit's files (`git add <explicit paths>`) -- never `git add -A` (the worktree
   carries pre-existing `.claude/commands-archive/**` + auto-gen wiki mirror churn that is NOT oscar's).
3. Commit with **raw `command git commit`** (NOT `rtk git commit` -- it mis-routes to the main
   tree + trips slot-commit-enforce, per GSD SS4 + [[feedback_rtk_git_commit_routes_to_main_tree]]).
   Prefix `[oscar] [OSCAR-SFC-9AXIS-MS0]/U-ID: title`, ASCII only (`--`, `x`, `->`).
4. Leave merge-to-integration to golf; do not push to main.

Pairs with [[feedback_commit_prefix_main_on_shared_tree]] (the `[MAIN]`-prefix rule is for the
shared `H:/prism` tree; in the slot worktree the prefix is `[oscar]`). Domain frontier:
[[reference_oscar_sfc_frontier_2026_06_10]]. Rule mirror in `engines/speed-feed/GSD.md` SS Git lane.
