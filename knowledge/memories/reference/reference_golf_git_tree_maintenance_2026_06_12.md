---
name: reference_golf_git_tree_maintenance_2026_06_12
description: Git-tree maintenance (golf 2026-06-12) - REPAIRED 7 corrupt (zeroed) slot worktree indexes that broke git for echo/foxtrot/india/juliett/kilo/lima/mike; removed 17 leaked agent worktrees; deleted 12 stale branches; found 45GB loose-object bloat (gc deferred)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.597Z
aliases: reference_golf_git_tree_maintenance_2026_06_12
---


**Git-tree maintenance + corruption repair (2026-06-12, slot:golf, operator: "work on git tree maintenance and improvements and organization").**

## CRITICAL REPAIR: 7 corrupt slot worktree indexes (the "corrupt tree" the inventory kept flagging)
`git fsck` aborted with `error: bad signature 0x00000000 / fatal: index file corrupt`. Root: **7 slot worktree index files were ZEROED** (`.git/worktrees/prism-slot-<slot>/index`, 4-6MB of 0x00):
**echo, foxtrot, india, juliett, kilo, lima, mike**. A zeroed index BREAKS `git status`/`add`/`commit` for that worktree -- so 7 active slots could not commit (silent until they tried). This is almost certainly why those slots showed git issues / the recurring "corrupt tree" inventory note (`e36809bbd2`, "fsck needs a real terminal").
- **Repair (safe + verified):** a zeroed index holds NO recoverable staged work (it's garbage); git rebuilds a valid index from HEAD without touching working files or commits. For each: `mv index index.corrupt-bak-20260612` then `git -C <wt> read-tree HEAD` -> fresh DIRC-signature index. Verified: india/kilo `git status` exit 0; **0 corrupt indexes remain (was 7)**. No work lost (only the already-destroyed staging area was reset).
- **Likely cause:** a crash/kill mid-`git add` (or a disk/IO fault) truncates+zeros the index. The fleet-reaper killing a node.exe mid-git-write is a candidate -- worth a guard (don't reap a process holding a git index lock). Recurrence detection: `for idx in .git/index .git/worktrees/*/index; do head -c4 | xxd; done` -- valid = `44495243` (DIRC), corrupt = `00000000`.

## Other maintenance done
- **Worktrees 80 -> 63:** removed **17 leaked `agent-*` ephemeral worktrees** (`.claude/worktrees/agent-*`, stranded on stale commit 4bdfcc902e). Auto-cleanup (Agent isolation:worktree "auto-removed if unchanged") was DEFEATED by regenerated noise (`mcp-server/data/state/ollama-offload-stats.json` + `.claude/cache/`) making them "changed". Guarded removal: only force-removed worktrees whose ENTIRE changeset was that known-noise. **`agent-a4553` PRESERVED** -- it had +16981/-9263 across 3085 tracked files (real divergence, not noise; do NOT blind-remove -- 1077-line lesson).
- **Branches 126 -> 114:** deleted 12 stale merged+no-worktree branches via `git branch -d` (safe: refuses anything not actually merged). 100 unmerged branches (unique work) + 27 slot/* + 13 in-use kept.
- `slot-worktrees.json` already has 26 entries (the inventory's "11->26" is already done).

## DEFERRED: git gc (45GB loose objects)
`.git` = **48GB, of which 45.06 GiB is LOOSE objects (382,667 objects)** -- in-pack only 861 MiB. This bloat slows EVERY git op fleet-wide (382K objects scanned -> the 194ms git-status + gate timeouts + sluggishness). `git gc` would pack them (~44GB reclaim + faster git) and is SAFE now that the index corruption is fixed -- BUT it is slow (10-30min) + locks the shared repo for 26 chats' writes, and there is NO disk pressure (1.6TB free). **Recommend running gc in a quiet window** (same as the slot/golf merge backlog). Cross-link: [[reference_golf_inventory_of_record_2026_06_11]], [[reference_golf_mcp_bridge_detect_and_merge_backlog_2026_06_12]]. Lesson: [[never-git-stash-in-a-shared-multi-chat-tree]].
