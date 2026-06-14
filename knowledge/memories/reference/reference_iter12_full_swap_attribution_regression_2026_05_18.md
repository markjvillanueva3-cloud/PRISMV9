---
name: reference-iter12-full-swap-attribution-regression-2026-05-18
description: "iter12 + juliett CAMX22 commits fully swapped file payloads under each others' subjects — shared-main-tree race in its purest form"
aliases: reference_iter12_full_swap_attribution_regression_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.163Z
---


**2026-05-18 BACKEND-DEV-LOOP iter12** (slot lima, claude-cdfb103c).

Second cross-attribution collision in the same session — but this time a **full payload swap** between two peer chats. State after the race:

| commit | subject | actual files |
|---|---|---|
| `ab4ed23db5` | `[JULIETT] [CAMX-MS0.3]/U-CAMX22-VISIBLE-SKIP` | scripts/wiki-propagation-watchdog.mjs (+9-2) + scripts/wiki-propagation-watchdog.test.mjs (+38) — MY iter12 fix |
| `b15beba942` | `[LIMA] [BACKEND-DEV-LOOP]/U-WIKI-WATCHDOG-PROBE-FIX [iter12]` | mcp-server/src/__tests__/CAMX-MS0.3-U-CAMX24-GCodeSetupSheet.test.ts (+225) — juliett's CAMX24 test |

Mechanism: between my `git add` (which `git diff --cached` confirmed staged correctly) and my `git commit -F`, juliett ran `git reset HEAD` (unstaging mine) + `git add -A` (staging hers). My subsequent `git commit -F .tmp-iter12c.txt` ran against juliett's staged files. Meanwhile juliett committed FIRST (with my originally-staged files) under their own subject.

**Result is benign in content but pathological in attribution**:
- The work IS in git: my watchdog fix is real, juliett's CAMX24 test is real.
- The work IS searchable by file content (git log -p).
- The work IS NOT searchable by `[SCOPE]/U-ID` correlation — `build-milestone-progress.mjs` will credit juliett's commit ab4ed23 to `CAMX-MS0.3 / U-CAMX22-VISIBLE-SKIP` (wrong) and lima's commit b15beba to `BACKEND-DEV-LOOP / U-WIKI-WATCHDOG-PROBE-FIX` (wrong).
- Both milestones will appear to have completed phantom work.

**iter11 was the same regression once; iter12 was twice. The shared-main-tree model is structurally broken for high-throughput multi-chat work.** The slot-worktree architecture (SLOT-WORKTREE-MS0, [[reference_slot_worktree_activation_2026_05_16]]) exists precisely to prevent this, but lima is still in `H:/prism` main tree. Per /checkin Step 2c, the migration is `git worktree add H:/prism-slot-lima -b slot/lima` and then route all commits there.

**Decision (R12):** do NOT rewrite history (destructive, peer-affecting). Do NOT spend the loop's tokens on a 100% hygiene chore (worktree migration) when 50 iter budget is /goal'd toward real work. DO document for the close-out auditor — both `U-WIKI-WATCHDOG-PROBE-FIX` and `U-CAMX22-VISIBLE-SKIP` lookups must consult BOTH commit SHAs to find their actual diff. Sister: [[reference_iter11_cross_attribution_regression_2026_05_18]].

**Anti-pattern for any chat staying in main tree:** never `git add -A` or `git commit -a`. ALWAYS `git add -- <explicit path>` and only commit when your `git diff --cached` shows exactly the files you staged. Even then, a peer racing between stage and commit can swap. Two consecutive verifies + commit-amend-after-the-fact is the only defense short of slot-worktree migration.

The actual iter12 work — fix the obsidian-feed probe path mismatch — IS LANDED and WORKING. Watchdog re-run after the fix:
- system-viz fresh (1.9h)
- leaf-index fresh (1.9h)
- embeddings fresh (1.8h)
- obsidian-feed fresh (0.3h)
- status: CLEAN

Sister: [[reference_slot_worktree_activation_2026_05_16]] · [[feedback_conflict_fork_rule]] · [[reference_iter11_cross_attribution_regression_2026_05_18]].
