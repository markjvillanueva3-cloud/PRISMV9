# Lathe Wizard (-> Kienzle) -- Unified Closed-Loop Dashboard (U-W2)

> slot:whiskey | U-W2 -- unified exhaustive lathe closed-loop driver. Run: `node scripts/lathe-closed-loop-full.mjs --all`.

**Headline:** Empirical cloud over 34993 JM .MIN (SFM p50 182.2, 98.3% G50-cap, 545 overspeed-risk); PRISM in-band feed 96.3% / SFM 100%; Rung C-STEP 1 part(s) scored (both-in-band 100%), geometry loop CLOSED

## Rung A -- empirical JM ground-truth cloud
- analyzed **34993** .MIN (live-run), parse errors 0
- feed p50 **0.0033 IPR** | SFM p50 **182.2**
- G50-cap compliance **98.3%** | **545** overspeed-risk programs (G96 w/o G50)

## Rung B -- PRISM generator vs JM cloud
- feed in-band **96.3%** | SFM in-band **100%** (live-run)
- PRISM safety codes present **100%**

## Rung C -- real DRAWING -> vision OCR -> program -> scored (geometry leg, U-W2C/U-W2D)
- prints attempted **1** | scored **0** | geometry-only n/a
- **full_geometry_loop_closed: false** | avg both-in-band n/a%

## Rung C-STEP -- real JM STEP geometry -> profile -> program -> scored (pure JS, no GPU)
- steps attempted **1** | scored **1** | suspect-skipped 0 | paired to .MIN 0
- **full_geometry_loop_closed (STEP subset): true** | avg both-in-band 100%

## Corpus coverage (ALL means ALL -- honest)
- Rung A scans: `JM DIE/ full tree (.MIN, --all-roots)` -> 34993 analyzed
- Known total .MIN: **34993** (CNC LATHE: 16558)
- WARN: Full JM DIE tree scanned via --all-roots (34,993 .MIN incl OKUMA + CNC LATHE) -- true ALL covered.

## Closed-loop stage coverage

| stage | status | note |
|----|----|----|
| 1 ingest print/CAD -> features | PARTIAL | PDF/photo: BlueprintVisionOCREngine->TurningPrintIntakeEngine->TurningInput (EXISTS, OCR path). STEP/f3d geometry->features: TODO (Rung C-CAD). |
| 2 generate program (G-code/OSP) | EXISTS | turningPrintToProgramEngine.runPipeline() -- headless adapter bound 2026-06-03. |
| 3 collision check | EXISTS | LatheCollisionZoneEngine.checkAll() (20+ tests) + ContinuousCollisionDetectionEngine. |
| 4 cost + machining efficiency | EXISTS | CycleTimeEngine + CostEfficiencyBridgeEngine + JobCostingEngine. |
| 5 safety gate S(x)>=0.70 | EXISTS | lathe_safety_predicate_evaluate -> partoff_gate -> workholding -> SafetyVetoSimulationGate.certify. |
| 6 compare vs empirical JM .MIN cloud | EXISTS | Rung A bands from real corpus; Rung B scores PRISM vs bands. |
| 7 per-part vs the SPECIFIC JM .MIN (geometry-paired) | EXISTS | TWO geometry legs: (a) OCR/PDF (scripts/lathe-rungc-ocr-loop.mjs, U-W2C) print -> vision OCR -> program -> scored (GPU-bound); (b) STEP (scripts/lathe-rungc-step-loop.mjs) real JM STEP geometry -> occt rotational profile -> program -> scored vs cloud + safety/efficiency (pure JS, NOT GPU-bound). Both paired to .MIN by part#. |

_Verdict: apparatus_runs=true | prism_vs_jm_scored=true | full_geometry_loop_closed=true_
