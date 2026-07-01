---
name: reference_cadfusion_874_behind_main_2026_06_16
description: cad-fusion-live-ms0 is 6360 ahead / 874 BEHIND main -- many apparent "unwired engine" / "RED committed test" gaps on this branch are branch-staleness (main already has the wiring), NOT real work; re-wiring them FORKS main and manufactures merge conflicts. Verify "absent on main too" before wiring on this branch.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.492Z
aliases: reference_cadfusion_874_behind_main_2026_06_16
---


**Branch-staleness trap on `cad-fusion-live-ms0`** (discovered slot:sierra, 2026-06-16, during XGAL cross-galaxy wiring).

`git rev-list --left-right --count main...HEAD` on the shared tree H:/prism = **874 (behind) / 6360 (ahead)**. cad-fusion-live-ms0 is a long-lived feature branch massively ahead of main but missing 874 main commits.

**Consequence:** a RED committed test or an "unwired engine" on cad-fusion-live-ms0 does NOT automatically mean undone work. It is frequently **staleness** -- main already wired it, and the wiring will arrive when the 874 main commits sync in. Concrete example: `turningDispatcherLatheProActions.test.ts` is 11/236 RED on cad-fusion (lathe_mandrel_analyze, lathe_face_driver_torque, lathe_sync_verify, lathe_trilobe_deformation, lathe_rules_generate, lathe_stock_feed_validate/advance/yield). All 8 actions ARE wired on main (commit `e9e017ab7c` "LATHE-PRO: Wire 6 gap-fill engines to turningDispatcher", count 2 each = ACTIONS+case) but absent at cad-fusion HEAD. **Re-wiring them on cad-fusion would FORK main's canonical version -> guaranteed merge conflict when the 874 commits sync.** So those RED tests are NOT a work item; they self-resolve on branch sync. DO NOT re-wire.

**The discipline (before wiring ANYTHING on cad-fusion-live-ms0 to satisfy a red test):**
1. `git log --all -S "<action>" --oneline -- <dispatcher file>` -- find every branch that touched it.
2. `git show main:<dispatcher> | grep -c '"<action>"'` -- is it ALREADY on main? If count >= 1, it is staleness; the fix is a branch sync, NOT a re-wire. Leave it.
3. Only wire if the target is absent on BOTH cad-fusion HEAD **and** main (a genuine never-done gap). Example that PASSED this test: `bar_feed_pitch_optimize` -- 0 commits on ANY branch, 0 on main -> genuinely novel, safe to wire (shipped in `4eb262ac20`).

**Same lesson, 3 scales this session:** (1) romeo `98693a6363` owned BarRemnant on slot/romeo with a divergent wrapped contract [[reference_xgal_bar_stock_trio_2026_06_16]]; (2) 5 of 6 "unwired" engines were owned-elsewhere integration tasks [[reference_xgal_embedding_guard_2026_06_15]]; (3) main owns the lathe-pro wiring this branch lacks. The "cross-galaxy unwired-engine / red-test" vein on this stale branch is largely mined out -- remaining apparent gaps are mostly staleness or peer-owned. The genuinely productive next step is an integrator-scale branch sync (main -> cad-fusion, 874 commits), which is an operator/golf decision, not a slot re-wire.

Doctrine: [[feedback_never_claim_absence_without_deep_search]] (verify against ALL branches, not just HEAD) + [[feedback_verify_actual_contract_not_proxy]].
