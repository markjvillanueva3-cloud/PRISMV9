---
name: reference_charlie_train_data_coverage_2026_06_02
description: U-QP-TRAIN-DATA-COVERAGE — train-cycle self-reports data-source coverage (data_source_coverage --json + human); consumes 2 of 5 quoting sources (baseline+outbound), names 3 unconsumed (cost-index/tool-purchases/docustrata) as the next-wire roadmap; read-only, units-safe
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.058Z
aliases: reference_charlie_train_data_coverage_2026_06_02
---


QUOTING-SYNERGY-MS0/U-QP-TRAIN-DATA-COVERAGE (slot:charlie, 2026-06-02, /loop /goal /yolo iter11, commit `f87ae28c09`). Pivots from the (now-complete) outbound-calibration thread to the unaddressed /goal clause "utilizing ALL documents and features" — by making the closed loop honestly REPORT which quoting data sources it actually trains on.

**SHIPPED:** `quoting-train-cycle.mjs` exports `QUOTING_DATA_SOURCES` (5-source manifest) + pure `dataSourceCoverage(dir, {existsImpl, outboundConsumed})`; emits `data_source_coverage` in --json + a human line. **Read-only existence check — NEVER reads/combines source contents** (the cost-index blends $/bar·$/foot·$/piece, so a real cost wire must be units-careful; deferred, NOT faked).

**LIVE COVERAGE (the finding):** the closed loop consumes **2 of 5** present quoting sources (**40%**): `baseline-records.json` (always) + `jm-sold-orders.json` (outbound, only when the real_distribution_match advisory ran). **UNCONSUMED = the next-wire roadmap:** `jm-vendor-cost-index.json` (inbound $10M AP cost basis — wired to prism_quoting:cost_index_prior but NOT fed to the train-cycle), `jm-tool-purchases.json` (tooling spend), `docustrata-invoices.curated.json` (real customer invoices). Reviewer-B TRACED the runOnce file-read path to verify this is accurate (not over/under-claiming): the cycle genuinely reads only baseline + outbound; cost/tool/docustrata are untouched.

**TESTS:** 7 hermetic node:test (manifest shape · all-present→40% · outbound-not-run→20% · absent-excluded-from-available · absent-consumed-flag-doesn't-inflate-count · zero-present→0%-no-NaN · per-source flag concreteness). Live tsx verified. 2-reviewer per-file PASS 0 P0/P1.

**NEXT (units-careful, deserves fresh context):** wire `cost_index_prior` into the prediction/FMV path as a real cost FEATURE (predictions use real per-category JM cost basis, not generic defaults) — BUT the cost-index is grain-blended ($/bar·$/foot·$/piece), a units-landmine requiring careful per-category grain alignment (NOT a naive price-minus-cost margin). Then docustrata invoices as a second real-revenue calibration target. Wiki: [[quoting-outbound-price-prior]]. Sibling: [[reference_charlie_cost_index_wire_2026_06_01]] · [[reference_charlie_ledger_ref_reliability_2026_06_02]].
