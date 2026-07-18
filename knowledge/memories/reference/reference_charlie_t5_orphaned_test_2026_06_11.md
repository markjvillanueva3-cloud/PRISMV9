---
name: reference_charlie_t5_orphaned_test_2026_06_11
description: T5 QuotingCalibrationHealthPage -- committed test expects a TrainingStatusPanel the committed page never had (impl swept, test orphaned). Blocks the closed-loop DISPLAY leg.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.514Z
aliases: reference_charlie_t5_orphaned_test_2026_06_11
---


**RESOLVED 2026-06-13 (slot:charlie, commit `512a112542`, U-QP-TRAINING-STATUS-UI).** The `TrainingStatusPanel` + `training_status` `Promise.all` fetch was reconstructed into `QuotingCalibrationHealthPage.tsx` FROM the test contract; all 6 orphaned cases now PASS, plus 2 new R9 cases for the `docustrata_actuals_match` render (the $355M Orders-Closed advisory from U-QP-TRAINCYCLE-FEED `c26605117d`). 8/8 green, tsc clean, 2-reviewer per-file scrutiny PASS. The page also wires a `RealWorldMatch` block surfacing real-world price validation (verdict/median_ratio/real $ total/actuals_priced, ADVISORY -- never alters the factor). Follow-on step (2) `ClosedLoopHealthPanel` ALSO SHIPPED 2026-06-13 (commit `b99b82f382`, U-QP-OUTCOME-DIGEST-UI): the page now passes `includeOutcomeDigest:true` and renders the OODA outcome digest (total_cycles + 6-verdict distribution + advisory health HEALTHY/NEEDS ATTENTION/INSUFFICIENT + reasons) from `QuotingOutcomeLedgerDigestEngine`. +3 R9 tests (11/11 total green), 2-reviewer PASS. Both display legs (TrainingStatusPanel + ClosedLoopHealthPanel) are now LIVE on `QuotingCalibrationHealthPage`. Original finding preserved below for history.

---

**T5 ORPHANED-TEST FINDING** (slot:charlie, 2026-06-11, R12). Attempting the closed-loop DISPLAY leg (render the U-QP-OUTCOME-LEDGER-DIGEST health verdict in `QuotingCalibrationHealthPage`), I found the page+test are SPLIT:

- The committed test `mcp-server/web/src/__tests__/QuotingCalibrationHealthPage.test.tsx` (T5, dated 2026-06-11) asserts a **`TrainingStatusPanel`** rendering `training_status` snapshot fields ("Closed-Loop Training Status", MAPE `12.5%`, coverage `2/3 sources consumed`, `Promise.all` parallel fetch, dormant `skip_reason`, etc.) -- 6 R9 contract-lock cases.
- The committed PAGE `mcp-server/web/src/pages/QuotingCalibrationHealthPage.tsx` has **ZERO** of those: `grep -cE "TrainingStatusPanel|training_status|Promise\.all"` = 0. Its `refresh()` makes ONE sequential `quoting_active_factor_get` call (no `training_status`, no `Promise.all`). The page's MOST RECENT commit is `afe76af0a2` (2026-05-25, /goal-19) and even THAT has `TrainingStatusPanel=0` across the last 8 commits.

**Root cause (shared-tree impl-sweep split, R12):** T5 (2026-06-11) committed the TEST but the page IMPL (the TrainingStatusPanel + training_status wiring + Promise.all refresh) was an UNCOMMITTED edit that got swept before it committed -- same class as this session's feedOutcome-edits-swept-into-bravo's-commit. OPEN-THREADS claimed T5 "DONE-VERIFIED-WIRED + TESTED 6/6 green"; the test WAS green at T5-time (against the then-uncommitted page), but only the test reached cad-fusion-live-ms0. The committed test is now orphaned -- it would FAIL (elements absent) if the web vitest harness ran it (which doesn't resolve cleanly via `npx vitest run web/...` from mcp-server -- web tests need their own config).

**Impact on the DISPLAY leg:** the closed-loop self-observation chain backend is COMPLETE + committed this session (emit `edb4986a50` -> read `88d5389e57` -> consume `9c72a7727c`). The DISPLAY leg (panel rendering the digest health verdict) is BLOCKED on first reconstructing T5's TrainingStatusPanel into the page, because: (a) the orphaned T5 test must pass, (b) adding a digest panel onto a page missing TrainingStatusPanel ships on a broken foundation. My ClosedLoopHealthPanel edit was built + then REVERTED (`git checkout -- <page>`) rather than shipped untested on the regressed page.

**NEXT (fresh budget):** (1) reconstruct `TrainingStatusPanel` + the `training_status` call + `Promise.all(refresh)` into the page FROM THE TEST'S CONTRACT (the test's `trainingOk()` fixture + assertions fully specify the shape: snapshot.{mape_pct,data_source_coverage,baseline_fallback,skip_reason,ts_iso,total_predicted,active_factor_written,safe_to_activate}); (2) add the `ClosedLoopHealthPanel` (calls `closed_loop_outcome_digest`, renders health verdict + by_verdict distribution); (3) run the web tests with the CORRECT harness (likely `web/vitest.config.ts` or from web/ dir, jsdom). Cf [[reference_shared_tree_commit_sweep_2026_06_02]] + [[reference_charlie_outcome_digest_2026_06_11]].
