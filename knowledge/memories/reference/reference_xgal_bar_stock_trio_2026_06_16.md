---
name: reference_xgal_bar_stock_trio_2026_06_16
description: U-XGAL-BAR-STOCK-TRIO -- completing the turningDispatcher bar-stock wire surfaced 3 reusable silent-failure patterns (committed-test RED at HEAD, wired-case-with-no-schema = validation skipped, and a cross-slot FLAT-vs-WRAPPED return-contract fork between cad-fusion and slot/romeo)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.268Z
aliases: reference_xgal_bar_stock_trio_2026_06_16
---


**XGAL-WIRE/U-XGAL-BAR-STOCK-TRIO** (slot:sierra, cross-galaxy authorized, 2026-06-16, commit `4eb262ac20` on cad-fusion-live-ms0).

Started as "wire the unwired BarRemnantManagementEngine to turningDispatcher." Pulling the thread (reading the SIBLING committed test `turningDispatcher.barStock.test.ts` before writing a new one -- R8 read-first) surfaced that the test was **RED at HEAD** (10/16 failing) and revealed three distinct silent-failure patterns:

1. **A committed test can be RED at HEAD -- "a test exists" != "it passes."** `turningDispatcher.barStock.test.ts` exercises three bar actions (`bar_feed_pitch_optimize`, `bar_remnant_plan`, `bar_stock_cut_plan`) but at HEAD of cad-fusion-live-ms0 only `bar_stock_cut_plan` was wired. The other two engine groups + the advertise-in-description assertions were failing. Lesson: when wiring an engine, GREP/RUN the sibling test first; the red committed test IS the spec for what to wire (sibling of [[feedback_read_full_content_not_titles]]).

2. **Wired case + MISSING Zod schema = validation silently skipped (silent-no-op).** `bar_stock_cut_plan` had a switch case at HEAD but NO entry in `TURNING_ACTION_SCHEMAS`. `validateActionParams` returns valid when it finds no schema for an action, so empty `requirements[]` / empty `bar_options[]` / negative `kerf_mm` all passed through unvalidated -- the engine ran on garbage and returned a result with no `success` field, so the 3 Zod-reject tests got `undefined` instead of `false`. Fix: add the schema (`.min(1)` on the arrays, `.nonnegative()` on kerf). Audit rule: an action in the dispatcher switch MUST have a schema-map entry, else its inputs are unguarded.

3. **Cross-slot return-contract FORK (R7 conflict).** slot/romeo `98693a6363` ([WIRING]/U-WIRE-BARREMNANT) independently wired the SAME engine with **4** `bar_remnant_*` actions (plan/record/count_feasible/stats) + a 12-case test -- but returns a **WRAPPED `{success, data}`** shape. The committed barStock test (shared on both branches, predates both wirings) reads **FLAT** (`out.assignments`, matching the `bar_stock_cut_plan` sibling). So romeo's wrapped wiring BREAKS the committed shared test; cad-fusion's FLAT wiring satisfies it. R7 resolution: keep FLAT here (it satisfies the shared contract romeo's fork violated), do NOT cherry-pick romeo (would re-break the test), do NOT fork further (no record/stats added), and LOUDLY FLAG the divergence in the commit body for the integrator to reconcile to ONE contract at merge (recommend FLAT). romeo's extra bar_remnant_record + bar_remnant_stats are worth porting in flat style later.

**Shipped:** `bar_feed_pitch_optimize` (NEW wire -- zero commits on ANY branch had wired it; genuinely unowned gap) + `bar_stock_cut_plan` schema (closes the silent-validation gap) + `bar_remnant_plan`/`bar_remnant_count_feasible` (flat, contract-correct). Committed barStock.test.ts 10/16-RED -> 16/16; new `turningDispatcher.barRemnantCount-wire.test.ts` 8/8 (deterministic countFeasible reference values, both reviewers arithmetically verified). tsc 0-new. 2-agent scrutiny PASS (after a first invalid pass that reviewed the wrong worktree -- see below).

**Process lesson (own mistake):** the first scrutiny dispatch gave the agents RELATIVE paths; their cwd is the slot worktree `H:/prism-slot-sierra` while the edits live in the SHARED tree `H:/prism`, so they reviewed a tree without the change and (correctly, for that tree) returned FAIL + surfaced the romeo commit. When dispatching scrutiny on shared-tree edits from a slot session, ALWAYS pass ABSOLUTE `H:/prism/...` paths. The "wrong" FAIL was the thing that surfaced the romeo duplication -- a lucky catch, not a designed one.

Related: [[reference_xgal_embedding_guard_2026_06_15]] (prior cross-galaxy wire; same "unwired engine != cleanly-wireable" caution). Pattern sibling: [[reference_turning_cascade_api_bug_2026_05_19]] (bravo wired 6 turning engines). Doctrine: [[feedback_verify_actual_contract_not_proxy]] (flat-vs-wrapped is a contract-shape mismatch).
