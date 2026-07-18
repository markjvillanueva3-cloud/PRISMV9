---
name: lock-orphan-leak-ufgc2-2026-06-04
description: "chat-slots.mjs releaseLock RENAMED the lock to *.released-<ts> instead of deleting it -> leaked 1 orphan/release, 28,761 accumulated = 57% of the repo entire git-status churn. U-FGC-2 fix: unlinkSync primary + sweep + gitignore + 2 tests. git status 56,589->28,013 (-50.5%). >90% target still needs the wiki track/ignore policy call (crossroad, NOT auto-decided)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.646Z
aliases: reference_lock_orphan_leak_ufgc2_2026_06_04
---


2026-06-04 (slot golf, FLEET-GIT-CONTENTION-MS0 U-FGC-2 pickup of alpha's milestone).

**Finding.** `git status` on shared H:/prism = 56,589. The #1 contributor was **28,761 untracked `state/shared/chat-slots.lock.released-<epochms>` files** (57% of all churn). Root cause: `.claude/helpers/chat-slots.mjs releaseLock()` (line ~446) did `renameSync(lockPath, lockPath+'.released-'+Date.now())` — the comment said "best-effort delete" but it RENAMED, leaking one orphan per lock release across all 26 slots, accumulating for months.

**Fix (commits 50f598afcf + 3e39feeaaa):** `unlinkSync(lockPath)` primary, rename kept only as a Windows unlink-race fallback; swept 28,761 orphans; `.gitignore` `state/shared/*.lock.released-*`; +2 regression tests (`chat-slots-release-no-orphan.test.mjs` — reviewer B confirmed load-bearing by mutating releaseLock back to rename → both RED). **git status 56,589 → 28,013 (-50.5%).** 3-of-3 PASS.

**Still open — NOT auto-decided (R12 crossroad).** >90% (the U-FGC-2 acceptance) is NOT met by the lock fix alone. Residual 28,013 dominated by ~16K generated-but-content-like `knowledge/wiki/architecture/` per-action pages (16,797 tracked vs 13,161 untracked). Track-vs-ignore = a genuine cross-PC-divergence policy decision (cad-fusion-live-ms0 is diverged 2571 ahead / 1 behind origin), NOT blind noise. Flagged for operator; did NOT untrack 16,797 committed files autonomously. Next: surface the wiki-content decision; U-FGC-3 (slot-worktree adoption) still pending.

Lesson [[chat-slots-lock-orphan-leak-2026-06-04]] (wiki). Sibling hazard re-hit same session: [[reference_shared_tree_commit_sweep_2026_06_02]] (foreign hermes files absorbed into a golf commit → extracted via reset --soft + restore --staged). Builds on [[reference_fleet_git_contention_golf_pickup_2026_06_04]].
