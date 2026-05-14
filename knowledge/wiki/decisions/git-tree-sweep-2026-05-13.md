---
title: Git Tree Sweep 2026-05-13
date: 2026-05-13
agent: claude-80d35610
slot: alpha
milestone: CLEANUP-MS0
tags: [git, worktrees, cleanup, infrastructure]
links:
  - "[[reference_h7_async_hook_dispatcher]]"
  - "[[feedback_conflict_fork_rule]]"
  - "[[reference_master_index_surface]]"
---

# Git Tree Sweep 2026-05-13

## Summary

Full audit of `H:/prism` git tree. Pruned 1 corrupt + removed 3 cleanly-merged worktrees. No branches qualified for archival (oldest unmerged was 82 days, below the 90-day threshold).

## Trigger

Operator request during slot-alpha checkin: classify the 51 worktrees + 119 branches and clean what can be cleaned safely, then sync /system-viz + Obsidian to match.

## Punchlist methodology

`scripts/classify-git-tree.mjs` (new) scores each worktree + branch on:

- worktree HEAD valid (non-zero SHA)
- branch ref still exists
- branch merged into primary base (`cad-fusion-live-ms0`) or secondary (`origin/main`)
- worktree directory present + clean
- last-commit age vs 90-day archive threshold

Output: `state/shared/GIT-TREE-PUNCHLIST.{json,md}` with five recommendation classes — `KEEP`, `REMOVE_WORKTREE`, `PRUNE_CORRUPT`, `ARCHIVE_TAG_AND_DELETE`, `NEEDS_REVIEW`.

## Actions taken (Phase 1)

| Action | Target | Reason |
|---|---|---|
| `worktree remove --force` | `H:/prism-xproc-neural` | HEAD was all-zero SHA (corrupt) |
| `worktree remove`         | `H:/prism-cinf04x-test`   | branch merged into `cad-fusion-live-ms0`, worktree clean |
| `worktree remove`         | `H:/prism-macro-pipeline` | branch merged into `cad-fusion-live-ms0`, worktree clean |
| `worktree remove`         | `H:/prism-pre-review-ms0` | branch merged into `cad-fusion-live-ms0`, worktree clean |
| `worktree prune`          | — | drop stale `.git/worktrees/*` metadata |

Result: 51 → 47 worktrees. Branches preserved (no `branch -D`).

## What was NOT done

- **12 worktrees classified `NEEDS_REVIEW`** — their branches are merged but the worktree directory still has uncommitted files (`H:/PRISM` itself has 4,752 dirty files; `H:/prism-cad-complete` has 3,811; etc.). These hold either WIP from peer chats or auto-regenerated state that's part of normal multi-chat operation. Manual review required before any worktree-remove.
- **No branches archived** — the oldest unmerged branch was `claude/interesting-shamir` at 82 days. Threshold is 90 days. Re-classify in ~10 days.
- **WORKTREE-CONSOLIDATE-MS0 envelope NOT reconciled** — drift report shows `recorded=9 / observed=0` but the envelope itself has `status: ready` and zero units in `shipped` state. The 9 recorded ships come from peer commits using `[MERGE-STAGING] WORKTREE-CONSOLIDATE-MS0:` prefixes that the drift detector can't tie back to U-IDs. Owner of that milestone must reconcile; out of scope for this sweep.

## Safety properties

- **Reversible:** every `git worktree remove` leaves the branch ref intact. Recreate any worktree with `git worktree add ../<path> <branch>`.
- **Read-only audit first:** all destructive ops were preceded by a punchlist file the operator could inspect at `state/shared/GIT-TREE-PUNCHLIST.md`.
- **No branch deletions:** Phase 2 (archive-tag-and-delete) found zero qualifying branches; nothing was deleted.

## Watchdog status

Parallel to this sweep, attempted to launch a Monitor-tool RAM/zombie watcher (`.claude/helpers/ram-zombie-watch.mjs`). It died at exit 255 after a few ticks regardless of script content — even a minimal "emit timestamp every 30s" version. Persistent-mode Monitor is unreliable in this CLI/sandbox combo. The four existing Windows scheduled tasks (PRISM Hook Janitor 2min, PRISM Node Orphan Cleaner 5min, PRISM Orphan Process Reaper PS 5min, PRISM Zombie Reaper v2 5min) are all `Ready` with last `LastTaskResult: 0` and cover the cleanup the operator asked for. The Monitor script is kept as a `node` runnable for ad-hoc foreground use (`POLL_SEC=2 node ram-zombie-watch.mjs`) but is no longer wired through Monitor.

## Followups

- Re-run `classify-git-tree.mjs` in ~10 days to catch the four 75-82-day branches when they cross 90.
- `regen-wiki-from-viz.mjs` will pick up this entry on its next cron fire and link it into `knowledge/wiki/architecture/index.md`.
- `system-viz-on-commit.mjs` regenerates `state/shared/system-viz/system-graph.json` after this commit; if `:8765` is offline, restart with `node scripts/system-viz-server.mjs` (or whatever the launcher is) to see the new state.

## Artifacts

- `scripts/classify-git-tree.mjs` — punchlist generator
- `state/shared/GIT-TREE-PUNCHLIST.{json,md}` — current punchlist (regenerate any time)
- `.claude/helpers/ram-zombie-watch.mjs` — foreground watcher (not Monitor-wired)
- `.claude/helpers/watch-minimal.mjs` — diagnostic that proved Monitor persistent-mode auto-kills
