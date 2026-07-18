# CAD-DRAW-MAX-MS0/P1-U09 — [MAIN] [CAD-DRAW-MAX-MS0]/P1-U09 (slot:delta): CADToleranceSignalEncoderEngine - GD&T callouts → 6-d constraint signal

**Commit:** `e2be85e368e4` · **By:** markjvillanueva3-cloud · **At:** 2026-05-21T12:41:31-05:00
**Tags:** cad-draw-max-ms0, p1-u09, auto-distilled

## Subject
[MAIN] [CAD-DRAW-MAX-MS0]/P1-U09 (slot:delta): CADToleranceSignalEncoderEngine - GD&T callouts → 6-d constraint signal

## Body
```
[MAIN] [CAD-DRAW-MAX-MS0]/P1-U09 (slot:delta): CADToleranceSignalEncoderEngine - GD&T callouts → 6-d constraint signal

GD&T → encoder INPUT closure. The AI needs to see tolerance bands
BEFORE it picks ops, not just after regen-test tells it the part missed
spec (P0-U03 covers the after path). This engine turns a list of GD&T
callouts + dimensional tolerances into a 6-d constraint signal that
augments the 33-d unified feature → 39-d "tolerance-aware" feature for
LP04 ranking.

Layout (6-d, exported as TOLERANCE_SIGNAL_DIM):
- [0] tightestTolNorm   — min |tol_mm| log-normalized (sensitivity)
- [1] meanTolNorm       — mean |tol_mm| log-normalized (overall tightness)
- [2] calloutCountNorm  — log1p(count)/log1p(64) — how many specs
- [3] hasForm           — 1 if any flatness/straightness/circularity/cylindricity
- [4] hasOrientation    — 1 if any perpendicularity/parallelism/angularity
- [5] hasLocation       — 1 if any position/concentricity/symmetry/profile

Why presence flags vs hash: GD&T categories are physical — a position
callout demands a datum reference frame that a flatness callout does
not. LP04 must learn category-specific weights; hashing the symbol
would force it to relearn category boundaries every restart.

3 dispatcher actions:
- cad_tolerance_encode    (callouts → 6-d signal)
- cad_tolerance_augment   (33-d unified + 6-d tolerance → 39-d augmented)
- cad_tolerance_stats     (encoder counters)

17/17 vitest PASS:
- TOLERANCE_SIGNAL_DIM=6; empty input → 6-d zero + counter++
- single tight 0.01mm → tightest+mean both = log1p(0.01)/log1p(10)
- multi-callout: tightest < mean (0.05/0.5/0.5 → 0.05 vs 0.35)
- count log-norm: 64 → exactly 1.0; 0 → 0; monotonic (1<8<32)
- form flag: flatness/straightness/circularity/cylindricity → slot[3]=1
- orientation flag: perpendicularity/parallelism/angularity → slot[4]=1
- location flag: position/concentricity/symmetry/profile_* → slot[5]=1
- case-insensitive matching ('POSITION' → location flag)
- unknown symbol → no flag set
- invalid tolerance (NaN/-1/Infinity) excluded from min+mean
- all-invalid tolerances → numeric slots stay 0; count still reflects
- mixed-category callouts → multiple flags simultaneously
- R12 fail-loud: non-array throws TypeError
- augmentUnifiedFeature: 33-d + 6-d = 39-d; first 33 verbatim; tail =
  tolerance signal
- R12: non-array unifiedFeature throws TypeError
- getStats: encodings + emptySignals + totalCallouts

Files: engine (+130), test (+155, 17 cases), schema (+20, 3 entries),
dispatcher (+20, 3 cases).

Refs: ASME Y14.5-2018; existing cad_gdt_parse_enhanced / cad_fcf_validate
(provides callout parsing — this engine consumes their output);
CADRegenFeedbackAdapterEngine (P0-U03) for the after-the-fact regen
signal; CADUnifiedFeatureBridgeEngine (P1-U07) for the 33-d base.
```

## Files touched (5)
- .../CADToleranceSignalEncoderEngine.test.ts        | 160 +++++++++++++++++++++
- .../src/engines/CADToleranceSignalEncoderEngine.ts | 155 ++++++++++++++++++++
- mcp-server/src/schemas/cadActionSchemas.ts         |  21 +++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  20 +++
- 4 files changed, 356 insertions(+)

## Lessons surfaced in commit body
- till reflects

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e2be85e368e4`
- Milestone envelope: `mcp-server/data/milestones/CAD-DRAW-MAX-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._