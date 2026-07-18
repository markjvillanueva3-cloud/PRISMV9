# OSCAR-SFC-9AXIS-MS0/U-OSC-CONTROLLER-FEATURES — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CONTROLLER-FEATURES (slot:oscar): wire controller smoothing into the default prism_optimized path (FIX-2 from dead-axis triage)

**Commit:** `a2ec922ca277` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T20:44:42-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-controller-features, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CONTROLLER-FEATURES (slot:oscar): wire controller smoothing into the default prism_optimized path (FIX-2 from dead-axis triage)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CONTROLLER-FEATURES (slot:oscar): wire controller smoothing into the default prism_optimized path (FIX-2 from dead-axis triage)

The all-axis sweep + a 15-agent adversarial triage workflow found controller_smoothing_factor
(HSM/AICC/nano-smoothing/EPC/look-ahead, capped 1.8) reached the headline ONLY in aggressive_rush;
the default prism_optimized (Pareto-knee) path silently dropped it, so 4 named controller axes
produced ZERO change on the most-used path. FIX: apply the factor to FEED (mrr derives from feed,
applied ONCE, no double-count) in prism_optimized, leaving fz/vc/rpm canonical -> Kienzle Fc
(fz unchanged) + Taylor T (vc unchanged) untouched, no force re-check needed. cost_batch keeps the
drop by-design (V_min_cost not inflated); aggressive_rush unchanged. Physics-verified by the triage
workflow (FIX_SAFE=yes; core engine has zero refs to the factor -> no double-count).

LIVE: controller_features flips INERT -> speed_feed 57.4% feed/mrr spread; sweep verdict 18->19/25
LIVE. controller_brand correctly STAYS inert (by-design: capability is per-option-license not
per-vendor). 8 tests (engine physics-safety invariants + dispatcher round-trip R15), 20/20 green
incl. finishRaCap regression.
```

## Files touched (3)
- mcp-server/src/__tests__/controllerFeaturesWiring.test.ts     | 128 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts |  16 ++++++++++++---
- 2 files changed, 141 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a2ec922ca277`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._