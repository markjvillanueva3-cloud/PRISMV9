---
name: reference_charlie_outbound_price_calib_2026_06_01
description: OutboundPriceIndexEngine.compareToPredicted — distribution-match diagnostic (KS gap + median ratio + within-band) of predicted quotes vs the real JM outbound prior; the loop-closing training signal
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.510Z
aliases: reference_charlie_outbound_price_calib_2026_06_01
---


QUOTING-SYNERGY-MS0/U-QP-OUTBOUND-PRICE-CALIB (slot:charlie, 2026-06-01, /loop /goal /yolo iter5, commit `cd3f38be0a`). Builds directly on [[reference_charlie_outbound_price_prior_2026_06_01]] (iter4 shipped the real outbound *prior*; this is the *consumer*).

**What:** `outboundPriceIndexEngine.compareToPredicted(predicted: number[], {minConfidence, alignTolerance, indexPath})` compares the quoting model's predicted per-piece prices to JM's REAL outbound sold-price distribution and returns `{predicted, reference, medianRatio, withinBandPct, ksGap, verdict, advisoryOnly, caveat}`. Wired `prism_quoting:outbound_price_calibration`. The loop-closing diagnostic — answers "does our training OUTPUT match what JM actually CHARGES?".

**Why it matters (closes the iter59 gap):** iter59's real-revenue overlay got `match_pct=0` trying to JOIN orders→synthetic records by a nonexistent key. A DISTRIBUTION-MATCH sidesteps the join entirely — compare the model's output price *distribution* to JM's real *distribution* (two-sample KS + median anchoring), no per-part join required.

**Metrics:** `medianRatio` = predicted.median / reference.median (>1 = predicted above JM's real prices); `withinBandPct` = fraction of predicted in reference [p5,p95]; `ksGap` = two-sample Kolmogorov–Smirnov statistic (max CDF gap, 0=identical 1=disjoint). `verdict` ∈ aligned/predicted-high/predicted-low/insufficient-data.

**Safety (soul-refuse axes all cleared by 2-reviewer scrutiny):** READ-ONLY/advisory — emits NO quote, NO calibration factor (a downstream consumer must still apply the margin-floor gate). `alignTolerance` (default 0.15) is a dimensionless statistical alignment band, NOT an inline shop-rate/margin constant and NOT a softened quote-vs-actual reconciliation threshold — overridable + documented as such at 3 sites. `verdict` is MEDIAN-ANCHORED (P2 fix: JSDoc states ksGap/withinBandPct are the shape/coverage companions — don't read verdict alone for full distribution match). Defaults minConfidence:"high" (cleanest verified subset). Inherits advisoryOnly/caveat so the diagnostic is never mistaken for ground truth.

**Tests:** 29 vitest (exact KS 0/1, medianRatio 10/0.1/1.2, band 1/3, alignTolerance widening, non-positive exclusion, fail-soft, a drift-guard pinning `reference === pricePrior().unitPrice`, dispatcher required-`predicted` + round-trip). build:fast + tsc clean. 2-reviewer per-file scrutiny PASS (0 P0/P1).

**NEXT (R13, on a proven diagnostic foundation):** wire `compareToPredicted` into `quoting-train-cycle.mjs` so each cycle surfaces the real-distribution match alongside the synthetic-baseline MAPE — ADVISORY first (observe before altering the live calibration factor; the soul cautions on quote-vs-actual thresholds). Wiki: [[quoting-outbound-price-prior]].
