---
name: feedback_india_galaxy_superset_in_worktree
description: build the per-slot galaxy as a superset in the slot worktree; flag golf to favor it on conflict
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.430Z
aliases: feedback_india_galaxy_superset_in_worktree
---


slot/india worktree was N-behind the shared tree and lacked the ai-training galaxy dir, while alpha's india-pending scaffold lived in the shared tree.

**Why:** merging 1000s of commits forward is a conflict-storm quagmire; split-brain (half worktree, half shared) is worse. Superset-in-worktree honors slot-worktree doctrine + the `[india]` commit convention and is the lowest-risk path.

**How to apply:** build ALL galaxy files as supersets in `H:/prism-slot-india`; flag golf at handoff: "take slot/india's CLAUDE.md/MEMORY.md on add/add conflict — they're supersets + verified-accurate." [[project_alpha_galaxy_build_location_decision]] · [[feedback_commit_to_slot_worktree]] · [[feedback_conflict_fork_rule]]
