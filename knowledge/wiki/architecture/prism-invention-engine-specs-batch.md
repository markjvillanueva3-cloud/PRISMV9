---
schema: ideablock-v1
title: "INVENTION SPECS (batch) — Abbe, ToleranceStackMC, OEEDecomp, ABCJobCost + algorithms"
domain: "PRISM architecture"
category: invention
version_state: Current
confidence: 0.92
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - [[prism-invention-high-roi-engine-ideas]] (ideas E2,E4,E6,E8,A2,A3,A4)
  - The Phase-A math entries each spec derives from
extracted_via: human-authored
extracted_at: 2026-05-21T19:10:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-INVENTION-ENGINE-BATCH)
---

## Purpose

Phase-B builder-ready specs (compact form) for the remaining engine + algorithm inventions from [[prism-invention-high-roi-engine-ideas]]. Each block is a buildable contract. Detailed specs already shipped for E1/E7/F3; this batch exhausts the engine + algorithm queue. Every spec: run `duplicationGuardEngine.mustCheckBeforeCreating()` first; ship real tests + dispatcher wiring per [[wiring-pattern-engine-to-dispatcher]].

---

## E2 — AbbeErrorBudgetEngine

**Derives from** [[math-machine-domains-dynamics-kinematics-accuracy]] §Abbe + §21 errors.
**Contract:** `budget(input) → output`. Input: machine geometry (per-axis angular errors θ in μrad, axis lengths), measurement scale offsets `d`, target point in the work envelope. Output: `{ abbeError_um per axis, volumetricError_um (21-component superposition), dominantContributor, withinTarget: boolean }`.
**Algorithm:** `ε_Abbe = d·θ` per axis; sum the 18 component errors + 3 squareness; report the superposition at the target point.
**Edge cases:** θ=0 (perfect axis) → zero contribution; d=0 (scale in-line, ideal Abbe) → zero amplification; negative d → flip sign, still valid; missing axis → throw.
**Wiring:** `prism_machine_setup:abbe_error_budget` (new) + `prism_quality` (precision job pre-check). **ROI:** precision jobs need the error budget BEFORE committing; no engine computes the 21-component superposition today. ~250 LOC.

---

## E4 — ToleranceStackMonteCarloEngine

**Derives from** [[part-setup-tolerance-stack-up-methods]].
**Contract:** `stack(input) → output`. Input: dimension chain (each: nominal, distribution {type: normal|uniform|triangular|skew, params}, optional correlation pairs). Output: `{ assemblyDistribution {mean, std, p5, p95, histogram}, worstCase_mm, rss_mm, mcResult_mm, fitProbability }`.
**Algorithm:** sample each dimension N=10⁵ from its distribution (respecting correlation via a covariance/copula), sum the chain, measure the empirical output distribution. Also compute worst-case (Σ|T|) + RSS (√ΣT²) for comparison.
**Edge cases:** single dimension → degenerates cleanly; correlated pair → must use the covariance term (RSS alone is wrong); non-normal input → MC handles, RSS comparison flagged "RSS invalid here"; N too small → warn on MC standard error.
**Wiring:** `prism_calc:tolerance_stack_monte_carlo` + `prism_quality`. **ROI:** RSS lies for non-normal/correlated chains; MC is the honest answer. ~180 LOC. (Verify: `monte_carlo_tolerance` action may exist — extend not duplicate.)

---

## E6 — OEEDecompositionEngine

**Derives from** [[math-shop-floor-management-throughput-oee]].
**Contract:** `decompose(productionLog) → output`. Input: planned time, run time, ideal cycle, total count, good count (+ optional downtime-reason log). Output: `{ availability, performance, quality, oee, limitingFactor, lossBreakdown {downtime, speed, defect}, recommendation }`.
**Algorithm:** A = run/planned; P = (ideal·count)/run; Q = good/total; OEE = A·P·Q. The limiting factor = the factor furthest below 1.0; the loss breakdown attributes lost time to each.
**Edge cases:** run > planned (data error) → A capped at 1.0 + warn; count=0 → Q undefined → throw with clear message; ideal cycle = 0 → throw; P > 1 (ran faster than "ideal") → flag the ideal-cycle is mis-set.
**Wiring:** `prism_business:oee_decompose` (new) + `prism_automation:oee_calc` exists — verify, extend with the decomposition + recommendation. **ROI:** OEE as one number hides the lever. ~150 LOC.

---

## E8 — ABCJobCostEngine

**Derives from** [[math-business-management-costing-finance]].
**Contract:** `cost(input) → output`. Input: job (direct material, direct labor hrs, activity counts {setups, inspections, material-moves, ...}), activity-driver rates. Output: `{ abcCost, blanketRateCost, distortion (abc − blanket), trueCostPerUnit, isUndercostedByBlanket: boolean }`.
**Algorithm:** ABC = material + labor + Σ(activity_count·driver_rate). Blanket = material + labor + (labor_hrs·blanket_OH_rate). The distortion reveals low-volume high-setup jobs the blanket rate undercosts.
**Edge cases:** zero activity counts → ABC = material+labor only; negative counts → throw; missing driver rate → throw with which-driver; quantity=0 → per-unit undefined → throw.
**Wiring:** `prism_business:abc_job_cost` (new) alongside `costing_job_cost`. **ROI:** blanket overhead cross-subsidizes; ABC reveals which jobs lose money. ~200 LOC.

---

## A2 — Minimum-zone (Chebyshev) fit

**Derives from** [[math-cad-geometry-nurbs-gdt]] §best-fit.
**Contract:** `fit(points, featureType) → {center/axis/plane params, minZoneError, lsqErrorForComparison}`. featureType ∈ {plane, circle, cylinder, line, sphere}.
**Algorithm:** minimize the *maximum* deviation (Chebyshev / L∞) — a linear-programming or exchange-algorithm solve, NOT least-squares. For a plane: minimize the max |point-to-plane distance|. Report the LSQ fit alongside for contrast.
**Edge cases:** < minimum points for the feature (plane needs 3, cylinder 5) → throw; collinear points for a plane → degenerate, throw; NaN coordinate → reject.
**Wiring:** `prism_calc:fit_minimum_zone` + `prism_quality` (CMM feature extraction). **ROI:** ASME Y14.5.1 *mandates* min-zone for tolerance verification; most CMM software uses LSQ — a genuine compliance gap. ~200 LOC.

---

## A3 — Look-ahead feed-profile optimizer

**Derives from** [[math-cam-toolpath-mathematics]] §feedrate.
**Contract:** `optimize(toolpathSegments, machineLimits) → {perSegmentFeed[], totalCycleTime, decelPoints[]}`. machineLimits: max accel, max jerk, corner-accel limit.
**Algorithm:** N-block look-ahead — for each segment, compute the corner velocity `v_corner = √(A_max·ρ)` at its end; back-propagate so the machine decelerates *before* each corner; forward-propagate the accel limit. Trapezoidal or S-curve profile per segment.
**Edge cases:** segment shorter than `2·d_accel` → never reaches commanded feed (the starvation case — model it, don't ignore); zero-length segment → skip; sharp corner ρ=0 → full stop.
**Wiring:** `prism_cam:feed_profile_optimize` (verify vs existing `post_feed_optimize`). **ROI:** honest cycle-time + smoother motion; feeds the cycle-time estimator. ~250 LOC.

---

## A4 — Wright learning-curve fitter

**Derives from** [[math-business-management-costing-finance]] §learning curve.
**Contract:** `fit(unitTimeHistory[]) → {learningRate, T1, b, cumulativeAvgForQty(n), predictedUnitTime(n)}`.
**Algorithm:** `Tₙ = T₁·n^b`; log-linearize (`ln T = ln T₁ + b·ln n`), least-squares fit for `T₁` + `b`; learning rate = `2^b`.
**Edge cases:** < 2 data points → cannot fit → throw; non-monotonic data (times increasing) → fit anyway but flag "no learning detected"; n=0 → undefined → throw.
**Wiring:** `prism_business:learning_curve_fit` + `quote_estimate` (multi-unit quoting). **ROI:** correct multi-unit quoting; mis-quoting is a direct revenue leak. ~120 LOC.

---

## Provenance

Phase-B builder-ready batch specs — **60th canonical entry** of the 2026-05-21 pivot. Compact form (contract + algorithm + edge cases + wiring + ROI per invention) covering E2/E4/E6/E8/A2/A3/A4 from [[prism-invention-high-roi-engine-ideas]]. Authored 2026-05-21 by slot:hotel under U-WIKI-INVENTION-ENGINE-BATCH. Confidence 0.92 — every spec carries a verify-then-extend / duplicationGuard prerequisite; effort estimates need confirmation against the live engine inventory before any build. Companion: [[prism-invention-feature-specs-batch]] covers the features.

System injection: auto-surfaces on `Abbe error engine`, `tolerance Monte Carlo`, `OEE decomposition`, `ABC job cost`, `minimum-zone fit`, `Chebyshev fit`, `look-ahead feed`, `learning curve fit`, `invention spec` keywords.

## Cross-references

- [[prism-invention-high-roi-engine-ideas]] — the invention queue
- [[prism-invention-stability-lobe-advisor-spec]] · [[prism-invention-wiki-to-training-pairs-spec]] · [[prism-invention-queueing-leadtime-spec]] — the detailed Phase-B specs
- [[prism-invention-feature-specs-batch]] — companion (features)
- [[wiring-pattern-engine-to-dispatcher]] — every spec wires per this pattern
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (Phase B)
- [[feedback_do_optional_high_roi_work]] — standing rule
