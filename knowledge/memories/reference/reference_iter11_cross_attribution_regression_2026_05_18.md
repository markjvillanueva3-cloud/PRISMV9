---
name: reference-iter11-cross-attribution-regression-2026-05-18
description: iter11 lima files committed by peer DELTA under wrong subject — shared-main-tree git add -A collision
aliases: reference_iter11_cross_attribution_regression_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.624Z
---


**2026-05-18 BACKEND-DEV-LOOP iter11 cross-attribution regression** (slot lima, claude-cdfb103c).

Built iter11 `U-WIKI-WATCHDOG-WIRE` (3 files: `.claude/hooks/wiki-propagation-watchdog-stop.mjs` + `.test.mjs` + `knowledge/wiki/architecture/wiki-propagation-watchdog-stop.md`). Staged them with `git add`. Before I could `git commit`, peer **slot=delta** ran `git commit -a` (or equivalent `git add -A`) in the same shared `H:/prism` main tree and committed all 3 of my files alongside its own `fleet-task-health-recovery.md` under its own subject `[DELTA] [BACKEND-DEV-LOOP]/U-WIKI-FLEET-TASK-RECOVERY` (commit `b69d6ff27364279290f0618317fb935946099c87`).

**Net state:** the work IS in git history — files exist, hook is wired into Stop[0].hooks[43], 22/22 tests pass, live-invoke verified. **But:**
- The commit subject says `[DELTA] U-WIKI-FLEET-TASK-RECOVERY`, not `[LIMA] U-WIKI-WATCHDOG-WIRE`.
- `build-milestone-progress.mjs` (which grep's commit subjects for `[SCOPE]/U-ID`) will NEVER credit U-WIKI-WATCHDOG-WIRE → silent close-out debt class.
- Peer's commit grew from ~156 LOC (their own wiki) → 727 LOC (theirs + mine) — they may not even realize they grabbed extra files.

**Root cause:** shared main tree + 4993 modified + 10608 untracked files + peer doing `git add -A` = guaranteed mis-attribution lottery. The SLOT-WORKTREE-MS0 architecture exists exactly to prevent this — but lima hasn't migrated to `H:/prism-slot-lima` yet. `/checkin-lima` Step 2c is the canonical fix; should have happened at the start of this session.

**Recovery decision:** do NOT rewrite peer history (destructive). Do NOT add an empty `[LIMA] U-WIKI-WATCHDOG-WIRE-ATTRIBUTION-FIXUP` metadata commit (pollutes log, low value). DO record it here so the close-out audit knows the U-ID landed via `b69d6ff273` not its own SHA. Sister: [[reference_silent_close_out_drift_2026_05_17]].

**Lesson:** for any /loop session on a shared main tree, `git add <explicit-files>` only — NEVER `-A` or `-u`. Better: migrate to slot worktree via `/checkin-<slot>` Step 2c BEFORE the first build commit, not after the first collision.

Sister: [[reference_slot_worktree_activation_2026_05_16]] · [[feedback_conflict_fork_rule]] · [[reference_silent_close_out_drift_2026_05_17]].
