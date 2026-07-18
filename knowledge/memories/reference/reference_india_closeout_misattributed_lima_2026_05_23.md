---
name: india-closeout-misattributed-lima-2026-05-23
description: "India iter1 close-out (2 units flipped + 3 surfaces regen) swept into peer lima's commit 6f289da344 by shared-tree git-add window. Same pattern as iter2_html_adopt_misattribution_2026_05_18."
aliases: reference_india_closeout_misattributed_lima_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.617Z
---


# India iter1 close-out misattributed to lima — 2026-05-23

## What happened

India /loop iter1 (slot:india, session claude-9f3a8e4f) was a silent close-out reconciliation for FEATURE-GAP-AUDIT-MS0. Two units shipped + wired but envelope-drifted at `not_started`:
- **U-WIRE-BACKLOG-POST** (commits `1ffed06fb2` + `6e770fa9d8` — 14 actions, +13 prism_cam + RealTimeAdaptive on prism_adaptive_control)
- **U-GAP-POST-JMDIE-LEARNING** (commit `398e671a45` — gapReport + jmdie_post_gaps action, 856 LOC, 51/51 tests)

I flipped both to `completed` with full `exit_evidence`, then ran `build-milestone-progress.mjs` + `build-state-snapshot.mjs` to regen the 3 downstream surfaces. **All 7 files** (envelope + MILESTONE_PROGRESS.{json,md} + BUILD_STATE.{json,md,html}) were `git add`-ed cleanly. Before my `git commit` ran, peer **lima slot** committed `6f289da344` ([MAIN] [PRISM-ACADEMY-MOBILE-MS0]/U-PAM-DOCREFLECT) and **swept my 6 staged files into its commit**.

## The work IS in HEAD

`git show 6f289da344 --stat` confirms all 6 india close-out files landed (+381/-9), but the commit subject attributes them to lima's U-PAM-DOCREFLECT (a doc-reflection unit).

## Root cause

Shared-tree `git add` race window: between `git add <paths>` and `git commit -m`, a peer's `git commit -am` (or `git add . && git commit`) on the same H:/prism main tree picked up my staged blobs because the index is process-shared. The git-lock-sweeper hook had cleared a 24-second stale lock right before lima committed, opening the window.

## Precedent

Identical mechanism documented in `[[reference_iter2_html_adopt_misattribution_2026_05_18]]` and `[[feedback_no_git_stash_shared_tree]]`. Slot-worktree migration (`/checkin-india` step 2c) would prevent this — running in `H:/prism-slot-india` on `slot/india` branch eliminates index-share.

## Status

- Substantive work: DONE (envelope flipped, surfaces regen'd, in git at 6f289da344).
- Attribution: DRIFTED to lima's commit subject. Not amendable without rewriting peer history.
- Mitigation: this memory + iter-handoff body capture the india credit; future audit tools that scan commit subjects for `slot:india` will miss this close-out, but exit_evidence in the envelope itself is authoritative.

## Apply

- For high-stakes india close-outs going forward: migrate to slot worktree via `/checkin-india` step 2c BEFORE staging.
- For low-stakes: accept misattribution risk + record in memory like this one.
- The 4-surface close-out per [[feedback_roadmap_close_out]] still completed — peer absorption changed who got commit credit, not whether the work shipped.

Related: [[feedback_no_git_stash_shared_tree]] · [[reference_iter2_html_adopt_misattribution_2026_05_18]] · [[feedback_commit_prefix_main_on_shared_tree]] · [[feedback_conflict_fork_rule]]
