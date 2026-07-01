---
name: reference_zulu_build_cron_git_grounded_2026_06_16
description: "The zulu build-loop cron now grounds shipped-detection in git commits (U-ZBL-C<n>), not drifty/missing brief prose — fixed a falsely-pending drained queue."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.281Z
aliases: reference_zulu_build_cron_git_grounded_2026_06_16
---


# Zulu build-loop cron: shipped-detection grounded in git reality (2026-06-16, slot:bravo)

The autonomous zulu build-loop pointer (`state/shared/zulu-build-loop-next.json`, written by the `PRISM Zulu Build Loop` cron via `scripts/zulu-build-loop.mjs`) **falsely showed the DRAINED C1-C8 capability queue as pending** (`next: C1, drained: false, done: 0`) while all 8 units were genuinely shipped (8 `Zulu*Engine.ts` files + 8 `U-ZBL-C<n>` / `U-ZULU-CAP-C<n>` commits on cad-fusion-live-ms0). Entering `/loop` on that stale pointer would rebuild the shipped C1 and hit the duplication guard.

**Root cause:** `parseShipped` (`scripts/lib/zulu-build-queue.mjs`) read shipped ids ONLY from the bravo brief's `## SHIPPED` prose (`state/shared/slot-briefs/bravo.md`). That prose DRIFTS or goes missing — live, the brief was unreadable, so `parseShipped("")` returned an empty set and the cron marked the whole queue pending. Sibling of the 2026-06-15 `parseShipped` prose-miscount regression ([[reference_zulu_parseshipped_prose_miscount_fix_2026_06_15]]).

**Fix (committed `[MAIN] [ZULU-BUILDLOOP]/U-ZBL-GIT-GROUNDED-SHIPPED`):**
- `parseShippedFromCommits(gitLogText)` (pure) — extracts C-ids from commit subjects `U-ZBL-C<n>` / `U-ZULU-CAP-C<n>`, splitting the combined ship form `U-ZULU-CAP-C1C2C3` into C1+C2+C3.
- `buildQueueFromTexts` unions brief prose + git reality (`opts.gitLogText`); legacy brief-only path preserved.
- `zulu-build-loop.mjs` reads a fail-soft read-only `execFileSync git log -400` (git absent/timeout → brief-only fallback, never fails the cron).
- 19/19 tests (7 new). LIVE: driver run flipped the pointer `next=C1 done=0` → `DRAINED done=8 pending=0`.

**Why:** prove "shipped" by REALITY (git commits / artifact existence), never by hand-maintained prose that drifts. A SHARED, cron-written single-source-of-truth must derive from a non-drifting signal.

**How to apply:** any queue/ledger/cron that computes "done vs pending" from a hand-maintained markdown section is a drift hazard — ground it in git commits or file existence. Files: `scripts/lib/zulu-build-queue.mjs`, `scripts/zulu-build-loop.mjs`. Related: [[reference_zulu_parseshipped_prose_miscount_fix_2026_06_15]].
