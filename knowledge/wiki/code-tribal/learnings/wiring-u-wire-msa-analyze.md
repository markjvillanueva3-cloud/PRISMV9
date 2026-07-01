# WIRING/U-WIRE-MSA-ANALYZE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRING]/U-WIRE-MSA-ANALYZE (slot:romeo): MeasurementSystemAnalysisEngine -> prism_dev:msa_analyze

**Commit:** `6620095eaf39` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T14:36:44-05:00
**Tags:** wiring, u-wire-msa-analyze, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRING]/U-WIRE-MSA-ANALYZE (slot:romeo): MeasurementSystemAnalysisEngine -> prism_dev:msa_analyze

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRING]/U-WIRE-MSA-ANALYZE (slot:romeo): MeasurementSystemAnalysisEngine -> prism_dev:msa_analyze

Fourth genuine-orphan wire from the classifier-aware hunt (b902ac2024). Pure static Gage R&R via crossed
ANOVA (AIAG MSA 4th ed) — quantifies measurement-system variation (EV/AV/IV/PV/GRR), %GRR verdict
(acceptable<10% / marginal / unacceptable>30%), NDC. No I/O. analyze() runs MsaStudySchema.parse + throws
on insufficient (<2 parts, <2 trials) or non-rectangular data -> converted to a structured error (valid
data returns fine, not a throws-on-every-call wire).

Verified GENUINE_ORPHAN + type-(a) self-contained via scripts/classify-engine-reachability.mjs. 5 round-trip
tests THROUGH prism_dev: near-perfect gage (tiny noise, distinct parts) -> acceptable %GRR<10 + SS_part>>SS_equipment
(anti-stub reference value); different study shape 2x1x3 with finite components (variability); insufficient-data
+ ragged-trials adversarial -> structured errors; enum-accept graded result. tsc-clean.
```

## Files touched (4)
- mcp-server/src/__tests__/devDispatcher.msa-analyze-wire.test.ts | 116 ++++++++++++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts                      |   6 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts               |  21 +++++-
- 3 files changed, 142 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6620095eaf39`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._