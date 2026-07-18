# POST-BRIDGE-SYNERGY-MS0/U-SFC-ABSORB-ENSEMBLE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-SFC-ABSORB-ENSEMBLE (slot:echo /loop iter46 /yolo): 4th SFC computer kind 'ensemble' — wraps iter43 kienzle+table+vendor into confidence-weighted blend with disagreement detection.

**Commit:** `3f9c0535da49` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T03:24:53-05:00
**Tags:** post-bridge-synergy-ms0, u-sfc-absorb-ensemble, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-SFC-ABSORB-ENSEMBLE (slot:echo /loop iter46 /yolo): 4th SFC computer kind 'ensemble' — wraps iter43 kienzle+table+vendor into confidence-weighted blend with disagreement detection.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-SFC-ABSORB-ENSEMBLE (slot:echo /loop iter46 /yolo): 4th SFC computer kind 'ensemble' — wraps iter43 kienzle+table+vendor into confidence-weighted blend with disagreement detection.

Closes the 4th of 5 COMPUTER_SOURCES from iter39 (now 4/5 = 80%
coverage). Ensemble is the production-default SFC surface for
operators: combines the safety of multiple estimators agreeing AND
surfaces disagreement when they don't.

Blend math:
  weightedMean(values, weights) — confidence-weighted mean
  sampleStdDev(values) — sample standard deviation (n-1 denominator)
  agreementFactor(VcValues) ∈ [0, 1]:
    cv = stdev / mean (coefficient of variation)
    factor = 1 - 2×cv (DISAGREEMENT_PENALTY_FACTOR=2)
    clamped to [0, 1]
  ensembleConfidence = mean(component confs) × agreementFactor

Disagreement gate: if components diverge by >50% on Vc (cv > 0.5),
agreementFactor → 0 and ensemble confidence is fully discounted →
operator must manually arbitrate. The penalty curve is steep on
purpose (factor 2 — small disagreement still bites) so the ensemble
never silently averages over a real divergence.

Hand-checked for P + face_mill + dia=12.7 + flutes=4:
  kienzle Vc=182.88 conf=0.75
  table   Vc=182.88 conf=0.65 (same as kienzle — same SFM table)
  vendor  Vc=213.36 conf=0.82 (Sandvik flagship uses sfm=700)
  weighted blend Vc = (182.88×0.75 + 182.88×0.65 + 213.36×0.82) / 2.22
                    = 430.9872 / 2.22 ≈ 194.139 m/min
  mean conf = 2.22 / 3 = 0.74
  vendor disagreement penalizes agreementFactor below 1.0
  ensemble conf < 0.82 (max component conf)

9 exports. 40 concrete-value tests including:
  - 4 ENSEMBLE_* constant invariants
  - 8 weightedMean cases (hand-checked 150 / 233.333, single value,
    zero weights null, empty null, mismatched length null, NaN weight
    filtered)
  - 6 sampleStdDev cases (sqrt(2.5) for [1..5], 0 for identical,
    sqrt(0.5) for [1,2], single null, empty null)
  - 7 agreementFactor cases (identical=1.0, [100,200,300]<0.5
    penalized, [1,100,10000] clamped to 0 floor, mean=0 degenerate,
    null/single defaults to 1.0)
  - 10 ensembleComputer cases (3 components, hand-checked Vc=194.139,
    confidence < max component, components array exposed, variability
    across 3 ISO groups, rationale includes componentCount)
  - LIVE end-to-end (5 assertions): wireEnsembleComputer registers
    into createSFCBridge, routeRequest preferred='ensemble' returns
    source='ensemble', ALL 6 ISO groups routable through ensemble
    (full variability floor), null bridge → null, bad fn → null

SESSION SCOREBOARD (iters 29-46, 18 envelope units shipped):
  ✓ Phase 9A tier-A novel:     5/5  ($30.5K/mo combined ROI)
  ✓ Phase 1 bridge enablers:   4/4
  ✓ Phase 2 node-bridges:      4/4
  ✓ Phase 3 absorption demos:  4/4 (DB 5/23, Wizard 3/3, SFC 4/5, PostGen 3/4)
  ✓ Phase 1-3 integration:     1/1
  + Ensemble extension:        1/1 (this iter)
Total: 18 units · 992 concrete tests · 0 stubs · 18 commits · ~7900 lines.

SFC absorption coverage advanced 60% → 80% (3/5 → 4/5 of
COMPUTER_SOURCES). Only 'ml' computer remains, which requires trained
weights — out of pure-fn scope.
```

## Files touched (3)
- scripts/lib/sfc-ensemble-computer.mjs      | 128 ++++++++++++++++++
- scripts/lib/sfc-ensemble-computer.test.mjs | 207 +++++++++++++++++++++++++++++
- 2 files changed, 335 insertions(+)

## Lessons surfaced in commit body
- till bites) so the ensemble

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3f9c0535da49`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._