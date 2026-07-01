---
name: reference_oscar_sfc_vendor_parity_run_2026_06_25
description: "SFC vendor-parity validation run (slot:oscar, 2026-06-25): PRISM vs 5-vendor baseline vs HSMAdvisor/G-Wizard via sfc-closed-loop-compare.mjs. Top finding: PRISM aluminum (N) Vc under-predicts 3.4x vs baseline (226 vs 775). Vendor comparators have coverage gaps."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.714Z
aliases: reference_oscar_sfc_vendor_parity_run_2026_06_25
---


**SFC vendor-parity validation run (slot:oscar, 2026-06-25).** Ran the existing (now bare-node-safe)
`scripts/sfc-closed-loop-compare.mjs` over the 6 canonical ISO cells to VALIDATE PRISM's physics vs the
5-vendor baseline + the operator's live HSMAdvisor/G-Wizard cribs. Availability: prism 6/6, baseline 6/6,
hsmadvisor 6/6, gwizard 0/6.

**PRISM Vc vs 5-vendor baseline median (the clean comparison):**
- P / 4140 steel / 10mm roughing: PRISM **229** vs baseline 220 (+4%, aligned)
- M / 304 SS / 8mm roughing: PRISM **140** vs 135 (+4%, aligned)
- K / gray iron / 16mm roughing: PRISM **170** vs 170 (exact)
- S / Ti-6Al-4V / 12mm roughing: PRISM **41.6** vs 55 (-24%, conservative)
- H / D2 62HRC / 6mm finishing: PRISM **42.8** vs 85 (-50%, conservative)
- N / 6061 aluminum / 6mm finishing: PRISM **226** vs baseline **775** (**-71%, a 3.4x UNDER-prediction**)

**TOP FINDING (real accuracy gap, follow-up):** PRISM's aluminum (ISO N) cutting speed is badly LOW --
226 m/min for 6061 finishing where the 5-vendor baseline is 775 and real carbide aluminum finishing runs
400-1000+ m/min. The P/M/K cells are well-aligned (+4% / exact) and S/H are conservative-but-defensible
(hard materials, safe direction), so the N gap stands out as a genuine under-prediction, NOT global
conservatism. **ROOT-CAUSED (iter 18) to the 9-axis orchestrator, NOT the table or the comparator wiring:**
(1) `CANONICAL_MILLING_SPEEDS.N` is CORRECT at `{rough 500, finish 800}` (matches the 775 baseline) -- do
NOT "fix" the table; (2) the comparator DOES pass `iso_group:"N"` to the orchestrator
(`SpeedFeedTriComparatorEngine.buildNineAxisInput:330` -> `SpeedFeedNineAxisOrchestratorEngine`); (3) yet
the orchestrator returns **226** (`rec.cutting_speed_mpm`, line 226/238), which ~= the LEGACY material-blind
path (carbide 150 * Brinell-adjust * finish-factor ~= 227, the same ~226 PRISM gives P-steel). So the bug is
INSIDE `SpeedFeedNineAxisOrchestratorEngine`'s Vc computation: it receives `iso_group:"N"` but does NOT use
the canonical N milling speed (800) -- it falls to a material-blind/Taylor-default path that under-predicts
aluminum 3.5x. FIX: trace the orchestrator's Vc model + make it honor `CANONICAL_MILLING_SPEEDS[iso].finish`
(or the material-aware `calculateSpeedFeed` ISO path) for N. Big physics-sensitive engine; physics-reviewed.
**CONFIRMED (iter 19) the customer PAGE is CORRECT -- the bug is ORCHESTRATOR-ONLY:** `productSFC("sfc_calculate")`
for 6061 aluminum gives Vc=**928 m/min** finishing / **580** slot-milling (vs 1045 steel 280) -- correctly
group-aware (it uses `calculateSpeedFeed`'s ISO path -> CANONICAL_MILLING_SPEEDS.N). So the customer-facing SFC
page/product is ACCURATE for aluminum; ONLY the 9-axis orchestrator path (used by the tri-comparator + the
sweeps) under-predicts N at 226. This NARROWS the orchestrator fix's blast radius (it does not affect the page
product) AND confirms the two SFC engines diverge ([[reference_oscar_sfc_engine_divergence_magnitude_2026_06_21]])
-- the orchestrator should adopt the page's material-aware ISO Vc path for N (and likely all groups).

**Vendor-comparator coverage gaps (not clean per-material comparisons):**
- **HSMAdvisor** returned a constant **200.6** for ALL 6 cells, correctly flagged "NOT aligned -- advisory":
  the crib has no material-matched tool for these canonical cells, so it reports one tool's value advisory-only
  (per-tool proven, no material model). Honest, but not a usable per-material HSMAdvisor parity signal here.
- **G-Wizard** abstained 6/6: the comparator selected `Accupro ACCU-0.0469 (drill)` -- a DRILL with no
  surface speed -- for every (milling) cell. The G-Wizard tool-selection is picking an inappropriate tool;
  it should match an endmill to the canonical milling cut. Comparator wiring follow-up.

So the vendor cribs (HSMAdvisor/G-Wizard) need material-matched tool selection before they yield real parity
numbers; the 5-vendor BASELINE is the currently-trustworthy external reference. The infra works (R15 validate
produced numbers) -- the next accuracy unit is the N-aluminum Vc gap. Sibling: [[sfc-jm-program-accuracy-methodology]].
