---
name: project_alpha_galaxy_build_location_decision
description: Why the alpha galaxy was built in the slot worktree as a superset, not the shared tree or via merge-forward
type: project
source: prism-memory
synced: 2026-06-27T20:30:46.457Z
aliases: project_alpha_galaxy_build_location_decision
---


2026-05-29 (slot:alpha claude-da9aacf5, U-PSGB-ALPHA): completed the token-optimization galaxy. Found the slot/alpha worktree (`H:/prism-slot-alpha`) was **53 ahead / 1772 behind** `cad-fusion-live-ms0`, and the galaxy's `CLAUDE.md`+`MEMORY.md` already existed in the shared tree (a prior alpha session's work, golf-integrated) but NOT in the worktree.

**Decision (R7 — surfaced, not blended):** (1) did NOT merge 1772 commits forward (quagmire, off-goal, conflict storm); (2) did NOT split-brain (build half in worktree, half in shared); (3) built ALL 4 galaxy files as **supersets** in the slot worktree + purely-additive new files (PATHS/TOOLBELT/wiki/skill/memories). The only golf merge surface is the CLAUDE.md/MEMORY.md add/add → golf favors the slot/alpha (more-complete) version.

**Why:** the brief's pre-flight assumes a current worktree; reality was 1772-behind. Superset-in-worktree is the lowest-risk path that still honors slot-worktree doctrine + the `[alpha]` commit convention. Flag for golf at handoff: "take slot/alpha's galaxy CLAUDE.md/MEMORY.md on conflict — they're supersets." Related: [[feedback_commit_to_slot_worktree]], [[feedback_conflict_fork_rule]].
