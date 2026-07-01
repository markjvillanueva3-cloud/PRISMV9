---
name: reference_charlie_drift_ref_reliability_2026_06_02
description: U-QP-DRIFT-REF-RELIABILITY — drift-summary summarizeLedger consumes the iter10 ledger reliability data; reference_drift_alert fires when >=3 measured cycles AND >=50% unreliable; tri-state, null never fabricates; closes the iter10 capture→consume loop
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.508Z
aliases: reference_charlie_drift_ref_reliability_2026_06_02
---


QUOTING-SYNERGY-MS0/U-QP-DRIFT-REF-RELIABILITY (slot:charlie, 2026-06-02, /loop /goal /yolo iter12, commit `31a8eeff85`). Closes the loop on iter10 ([[reference_charlie_ledger_ref_reliability_2026_06_02]]): the ledger CAPTURED `reference_reliable`/`reliability_verdict`, but no aggregator READ them. Now the drift-summary does.

**SHIPPED:** `summarizeLedger` (scripts/quoting-train-history-summary.mjs) adds 5 fields over the rolling window: `reference_measured_count`, `reference_unreliable_count`, `reference_unreliable_rate`, `latest_reliability_verdict`, `reference_drift_alert`. The alert fires ONLY when `refMeasuredCount >= REF_DRIFT_MIN_MEASURED(3)` AND `refUnreliableRate >= REF_DRIFT_RATE_THRESHOLD(0.5)` (dimensionless sample-quality bounds, NOT price constants). reference_reliable is TRI-STATE: true/false count as "measured"; null (no real_distribution_match that cycle) is excluded — so an all-unmeasured window yields rate=null + NO alert (absence-of-data never fabricates a signal). Read-only advisory — never gates a factor. Schema bumped 11->16 keys (stable, present on every return path).

**TESTS:** +5 (26 total). The load-bearing pair: "4 measured/3 unreliable/0.75 → alert TRUE" vs "2 measured/100% unreliable → alert FALSE (below the 3-min floor)" pins BOTH gates independently. + all-unmeasured→no-fabrication + tri-state-exclusion + latest-verdict. Consumers green (full-chain-smoke 6, pipeline-e2e 4). 2-reviewer PASS 0 P0/P1 (reviewer B re-dispatched after the first B hit a session limit). Fixed a sibling stale comment in quoting-train-drift-alert.mjs (11->16 fields).

**NEXT (the new operator /goal — much bigger):** "100% accuracy on quote vs JM existing shop documents; find improvements; determine if we under-quoted; what a fair quote should have been; optimal quote per job; using EVERY document — prints/cad/cnc/sfc/purchases/orders/tooling/machines/shop-rate/market/materials/overhead/bills/payroll, live-updated by market conditions." The advisory infrastructure (outbound prior, calibration diagnostic, reliability guard, ledger, drift-summary, coverage report) is the substrate; the next concrete deliverable is a PER-JOB under-quote assessment (JM actual quote vs model fair/optimal quote, flag under-quotes, quantify gap, units-careful). Wiki: [[quoting-outbound-price-prior]]. Sibling: [[reference_charlie_ledger_ref_reliability_2026_06_02]] · [[reference_charlie_train_data_coverage_2026_06_02]].
