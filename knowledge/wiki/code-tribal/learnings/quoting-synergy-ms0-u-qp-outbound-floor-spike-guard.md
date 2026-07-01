---
title: QUOTING-SYNERGY-MS0/U-QP-OUTBOUND-FLOOR-SPIKE-GUARD
slot: charlie
domain: quoting
commits: [e8e6745454, b51563327a]
date: 2026-06-11
tags: [quoting, closed-loop, outbound-price, ocr, reliability, regression-fix]
---

# Floor-spike reliability guard (U-QP-OUTBOUND-FLOOR-SPIKE-GUARD)

> Replaces the auto-distilled stub for commit `e8e6745454` with the full learning (the distiller's
> "arms A/B/C ✗" was a pre-scrutiny placeholder; the 3-of-3 PASSED -- see Verification).

## The bug
The quoting closed loop's ONE consumption point for real JM sold-order documents is
`gateOutboundAlignment` (QuotingClosedLoopEngine), which compares the model's predicted price
distribution to JM's REAL sold-price distribution via `OutboundPriceIndexEngine.compareToPredicted`.
Its reliability check `assessReferenceReliability` had guards for: no-reference, n-too-small,
median<=0, and an **IQR-collapse** guard (`(p75-p25)/median < maxConcentration`) for a NARROW spike.

JM's real `against:"line"` ext_price reference is a **BOTTOM-spike the IQR guard misses**. Live
validation (high+medium gate): **median = $1.005 with ~51% of observations at the exact OCR `$1`
minimum** (`minMassFrac 0.511`), while the real upper tail spreads p75=$227 / p90=$436 / p95=$977 ->
`iqrSpread ~225x`. So the IQR-collapse guard never fired; the reference read `referenceReliable:true`
on noise -> real-magnitude predictions read a FALSE `predicted-high` -> the gate over-blocked
promotion (`withheld-outbound-drift`). The OODA wire-in stayed gated.

## The fix
Added `minMassFrac` (fraction of observations equal to the minimum value) to `PriceDistribution`,
computed in `distributionOf`. New guard in `assessReferenceReliability`:
```
medianPinnedToFloor = reference.median <= reference.min * (1 + maxConcentration)
if (reference.minMassFrac >= maxBottomSpikeFrac && medianPinnedToFloor) -> degenerate-reference
```
New dimensionless param `maxBottomSpikeFrac` (default 0.25), wired through `compareToPredicted` and
BOTH dispatcher schemas (`outbound_price_calibration`, `outbound_promote_check`). The P1 a 3-of-3
reviewer (arm C) caught: Zod silently stripped the new param on the dispatcher path -> declared it in
both schemas (commit `b51563327a`).

## Why it does not false-positive
The conjunction requires the min-mass spike to ALSO pin the median to the floor. A genuinely
right-skewed clean distribution (or a small-n set like `[10,20,30]`, minMassFrac 0.33) has its median
ABOVE the minimum, so `medianPinnedToFloor` is false and it stays reliable. NEVER drops an
observation -- degeneracy is surfaced, not filtered (charlie soul: non-conservative-filter refusal).
NO price/margin constant introduced (soul refuse: inline-shop-rate-or-margin-constants) -- 0.25 and
the median-pin epsilon are dimensionless sample-quality bounds.

## Result / Verification
The OCR-noise reference now reads `degenerate-reference` -> `gateOutboundAlignment` returns
`unverified`/block:false (directional-only, no FALSE veto). **65/65 tests** (incl. a live-corpus
oracle that RAN, not skipped); **3-of-3 scrutiny PASS** (arms A holistic, B test/constants, C
regression/integration -- C raised the schema-strip P1, fixed in `b51563327a`).

## Honest scope (R12)
Makes the gate HONEST on noise. POSITIVE outbound guarding (a real veto from a CLEAN reference) still
awaits deeper OCR extraction that strips the $1 floor mass (xray domain). The broader "finish
closed-loop testing on real JM docs" goal remains blocked on the real (quoted, actual) PAIR gap:
`jm-sold-orders.json` has real prices but no customer/part keys and no paired quote; the quote-side
OCR is empty; the 47,905-record baseline `actual_revenue_usd` is synthetic size-stubs.

## Files touched
- `mcp-server/src/engines/OutboundPriceIndexEngine.ts` (minMassFrac + floor-spike guard + plumbing)
- `mcp-server/src/engines/QuotingClosedLoopEngine.ts` (caveat doc-sync)
- `mcp-server/src/schemas/quotingActionSchemas.ts` (P1: declare maxBottomSpikeFrac on both actions)
- `mcp-server/src/__tests__/OutboundPriceIndexEngine.test.ts` + `quotingDispatcher.test.ts` (tests)

## Cross-references
- Full commits: `git -C H:/prism show e8e6745454` / `b51563327a`
- Memory: [[reference_charlie_floor_spike_guard_2026_06_11]]
- Sibling gates: [[reference_charlie_outbound_promote_gate_2026_06_09]] · [[reference_charlie_provenance_gate_2026_06_09]]
