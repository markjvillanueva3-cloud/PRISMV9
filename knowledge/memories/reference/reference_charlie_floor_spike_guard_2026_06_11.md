---
name: reference_charlie_floor_spike_guard_2026_06_11
description: "Floor-spike reliability guard fixes the OCR-$1 false-reliable bug that disabled the quoting closed-loop's real-JM-data outbound gate."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.508Z
aliases: reference_charlie_floor_spike_guard_2026_06_11
---


**U-QP-OUTBOUND-FLOOR-SPIKE-GUARD** (slot:charlie, 2026-06-11, commits `e8e6745454` engine + `b51563327a` P1). The closed loop's ONE real-JM-data consumption point is `gateOutboundAlignment` (QuotingClosedLoopEngine), which compares predicted prices to JM's REAL sold-price distribution via `OutboundPriceIndexEngine.compareToPredicted`. It was effectively disabled: `assessReferenceReliability` only caught a NARROW (IQR-collapsed) spike, but JM's real `against:"line"` ext_price reference is a **bottom-spike** -- ~51% of high+medium-confidence observations are an OCR `$1` value (median ~1.005) while the real upper tail ($200-$2300) keeps the IQR WIDE (iqrSpread ~225x). So the reference falsely read `referenceReliable:true` -> real-magnitude predictions read false `predicted-high` -> the gate over-blocked (`withheld-outbound-drift`).

**Fix (dimensionless, no price constant -- soul refuse):** added `minMassFrac` (fraction of obs at the minimum value) to `PriceDistribution`; new guard `if (minMassFrac >= maxBottomSpikeFrac && median <= min*(1+maxConcentration)) -> degenerate-reference`. Default `maxBottomSpikeFrac=0.25`, wired through `compareToPredicted` + both dispatcher schemas (`outbound_price_calibration`, `outbound_promote_check`). The median-pinned half prevents false-positives (e.g. `[10,20,30]` has minMass 0.33 but median 20 != min 10 -> stays reliable). Live-validated: real corpus now `degenerate-reference` (was falsely reliable). 65/65 tests; 3-of-3 PASS (reviewer-C P1 = schema strip, fixed).

**Honest scope (R12):** this makes the gate HONEST on noise (degenerate -> `unverified`/no-veto). POSITIVE guarding from a CLEAN real reference still needs deeper OCR extraction that strips the $1 floor mass (xray domain). The deeper "finish closed-loop testing on real JM docs" final goal remains blocked on the real (quoted, actual) PAIR gap: `jm-sold-orders.json` (500 on-disk sample, real prices) has NO customer/part keys and no paired quote; the quote-side OCR (`docustrata-extracted.jsonl`) is empty; the 47,905 baseline corpus `actual_revenue_usd` is synthetic size-stubs. See [[reference_charlie_outbound_promote_gate_2026_06_09]] + [[reference_charlie_provenance_gate_2026_06_09]].
