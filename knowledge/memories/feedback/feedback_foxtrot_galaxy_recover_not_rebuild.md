---
name: feedback-foxtrot-galaxy-recover-not-rebuild
description: "Galaxy files may live on cad-fusion-live-ms0, not the slot worktree — recover+extend, never blind-rebuild."
type: feedback
slot: foxtrot
source: prism-memory
synced: 2026-06-27T20:30:46.426Z
aliases: feedback_foxtrot_galaxy_recover_not_rebuild
---


# Recover galaxy files from the shared branch before rebuilding

Per-galaxy files (`engines/<galaxy>/{CLAUDE,MEMORY}.md`, souls) frequently exist on `cad-fusion-live-ms0` (the shared tree H:/prism is checked out on) but NOT on your `slot/<nato>` worktree, and NOT on `main`/`slot/alpha`. A naive Glob of the worktree shows "missing" → tempting to rebuild from scratch → you clobber prior work.

**Why:** fleet work lands on cad-fusion-live-ms0 (1900+ ahead of origin); slot worktrees lag. The galaxy you're told is "missing" may be 90% built on another branch.
**How to apply:** before building any galaxy, probe `command git show cad-fusion-live-ms0:<path>` (and main/slot-alpha). If found, recover + EXTEND on your worktree; don't blind-overwrite. Matches [[feedback_bravo_complete_not_clobber_galaxy]] + [[project_alpha_galaxy_build_location_decision]]. Use `command git show` (NOT rtk — it compacts markdown).
