---
name: reference-golf-pathspec-absorption-2026-05-29
description: On the shared H:/prism tree, `git commit -- <broad-dir-path>` absorbs ALL staged changes under that path — including pre-staged peer DELETIONS. Commit named files, not dir pathspecs.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.598Z
aliases: reference_golf_pathspec_absorption_2026_05_29
---


**Finding (slot:golf, 2026-05-29, U-GBA07→U-GBA08):** A `git commit -- mcp-server/src/engines scripts/...` (intended to commit only golf's 27 backfilled `MEMORY.md` + a script) **absorbed 3 peer-staged engine deletions** (`BidWinCalibratorEngine.ts`, `InternalAuditCalendarEngine.ts`, `ManagementReviewEngine.ts`) — committing 40 files / 980 deletions instead of ~28 additive files.

**Root cause:** `git commit -- <pathspec>` commits **everything staged in the index under that pathspec**, not just the files you `git add`-ed. On the shared `H:/prism` tree, peers stage work concurrently (a peer had `git rm`-staged those 3 engines). A *directory* pathspec (`-- mcp-server/src/engines`) sweeps in any staged change under it, including deletions. This is the same hazard class as [[feedback_commit_prefix_main_on_shared_tree]] absorption, but bit harder because it deleted engines (violating [[feedback_never_delete_only_disable]] silently).

**How to apply (golf shared-tree commit hygiene):**
1. **Commit individually-named files**, NOT directory pathspecs, on the shared tree: `git commit -- path/to/a.md path/to/b.md` (explicit files only).
2. **ALWAYS `git diff --cached --stat` (or `git status -s`) BEFORE committing** on the shared tree — catch absorbed peer changes (esp. `D` deletions) before they land.
3. The real fix is a **slot worktree** (`H:/prism-slot-golf`) where only your changes exist — but galaxy/state files live in the `H:/prism` main tree, so cross-tree edits land there and contend.
4. If you absorb a deletion: restore from the parent — `git checkout HEAD~1 -- <file>` + commit (per never-delete-only-disable). Recovered here via U-GBA08.

Related: [[feedback_commit_prefix_main_on_shared_tree]], [[feedback_commit_to_slot_worktree]], [[feedback_never_delete_only_disable]], [[reference_golf_worktree_glob_gotcha]]. Galaxy: `mcp-server/src/engines/fleet-hygiene/MEMORY.md`.
