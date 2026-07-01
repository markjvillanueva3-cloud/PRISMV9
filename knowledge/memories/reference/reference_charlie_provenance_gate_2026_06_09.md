---
name: reference_charlie_provenance_gate_2026_06_09
description: "FINDING + FIX (2026-06-09, slot charlie, commit 4c12a75a8d): the quoting OODA closed-loop (QuotingClosedLoopEngine.runCycle) could PROMOTE synthetic/placeholder-trained calibration factors to the LIVE quote-time active-factor file. Gate was MAPE-only (shouldPromote; cold-start auto-promotes on ANY report) -> writeActiveFactors -> state/shared/calibration/quoting-calibration-active.json (read by QuotingActiveFactorLoaderEngine at every quote-time call). The runner feeds synthetic outcomes (constant-100 anchor + 10-row docustrata-invoices.curated.json placeholder), so a synthetic factor could pass CoV (self-consistency) and poison real customer quotes -- charlie soul refuse #4, unguarded. FIX: new pure classifyOutcomeProvenance() (real|synthetic|empty) wired into runCycle: empty->INSUFFICIENT_DATA(1b), synthetic/placeholder->new WITHHELD_SYNTHETIC verdict(6a), factors computed but NEVER written live. Fail-closed; logged allowSyntheticPromotion override. 40/40 tests, 3-of-3 scrutiny PASS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.511Z
aliases: reference_charlie_provenance_gate_2026_06_09
---


## The hazard (production-safety, R12/soul refuse #4)
`QuotingClosedLoopEngine.runCycle` (the OODA self-learning controller) gated promotion of new calibration factors ONLY on `shouldPromote` (a MAPE-delta comparison; `:252` **cold-start auto-promotes on ANY report**) -> `:366 writeActiveFactors` -> `state/shared/calibration/quoting-calibration-active.json`, which `QuotingActiveFactorLoaderEngine` reads at **every quote-time call**. But the OODA runner (`run-quoting-closed-loop-jm-corpus.mjs:216`) feeds the loop a **10-row curated placeholder** (`docustrata-invoices.curated.json`, source "manual-curation-bootstrap"), and `QuotingClosedLoopRunnerEngine.ts:310-320` stamps a **synthetic constant-100 quoted anchor**. A synthetic distribution PASSES the CoV gate (self-consistency, not real-world accuracy) -> synthetic-trained factors could promote to the live path and **poison real customer quotes**. This is charlie soul refuse #4 (`training-on-stale-bootstrap-distribution-without-freshness-preflight`), sitting unguarded -- the single thing between "demo loop" and "legit quoting software." (The iter59 data-ceiling: real quote-vs-actual revenue lives in JM's ERP/QuickBooks, which PRISM cannot read; E2ShopConnectorEngine is credential-gated + never connected. So the loop only ever sees synthetic/placeholder inputs today.)

## The fix (commit `4c12a75a8d`)
New exported pure `classifyOutcomeProvenance(outcomes) -> {verdict: real|synthetic|empty, mayPromote, real_outcome_count, signals}` (sibling to `shouldPromote`/`detectDrift` in `QuotingClosedLoopEngine.ts`). `real` ONLY if affirmatively proven: >=1 finite-positive `actual_invoice_usd` + non-degenerate `predicted_quote_usd` (catches the constant-anchor) + no placeholder/bootstrap markers. Wired into `runCycle`: `empty` -> `INSUFFICIENT_DATA` at step 1b (before any training); `synthetic`/`placeholder` -> new `WITHHELD_SYNTHETIC` verdict at 6a, factors retrained+validated but returned as `factors_withheld`, **never written to the live path**. **Fail-closed** (withholding is reversible; promoting synthetic factors is not). Explicit logged `allowSyntheticPromotion` CycleOption (default false) for controlled experiments. No inlined rate/margin constants; `shouldPromote` + every existing threshold unchanged (additive `&&` guard). 40/40 tests (11 new, R9 fail-on-revert: `writeActiveFactors` not-called on synthetic). tsc clean. 3-of-3 scrutiny PASS 0 P0/P1.

## Deferred (P2, scrutiny-flagged, non-blocking)
- WITHHELD branch skips `feedPSIDelta` (matches `ROLLED_BACK` precedent; a withheld synthetic batch arguably merits a distinct PSN signal).
- `dummy` marker could substring a real tooling SKU -> a fail-closed false-block (reversible, safe direction), not a poison.
- `ROLLED_BACK`/`NO_DRIFT_NO_OP` returns don't echo `provenance` though it's classified (observability asymmetry).

## Next units toward "closed-loop finished + production quoting"
1. **`QuotingActualOutcomeLoaderEngine`** -- project real persisted `ActualCostEngine.profitability()` (`estimated_cost`/`actual_cost`/`revenue`, cost-basis) into `CycleOutcome[]`, replacing the synthetic `loadOutcomes`. Needs job-enumeration off ActualCost (cross-galaxy READ; ActualCost is hotel/business-owned -- coordinate, don't re-impl the ERP connector). In prod the maps are EMPTY until E2/invoice ingestion lands, so the loader will honestly return `no-real-actuals` -- that's the point (wired-and-ready + fail-loud, the provenance gate then refuses to promote).
2. `prism_quoting:closed_loop_provenance_check` observability action over the classifier.
3. The real unblock is operator/ERP-side: live E2ShopConnectorEngine credentials OR an invoice-ingestion pipeline feeding ActualCostEngine.recordRevenue/recordEstimate.

Related: [[reference_quoting_closed_loop_engine_2026_05_26]] · [[reference_charlie_quoting_data_ceiling]] · [[reference_quoting_pipeline_iter58_iter59_2026_05_27]] · [[feedback_charlie_quoting_drift_freshness]]
