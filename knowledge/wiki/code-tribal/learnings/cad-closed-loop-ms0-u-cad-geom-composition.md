# CAD-CLOSED-LOOP-MS0/U-CAD-GEOM-COMPOSITION — [MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-GEOM-COMPOSITION (slot:india): add the surface-TOPOLOGY training signal -- a quantitative step beyond presence-only toward geometric fidelity.

**Commit:** `22be177ec339` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T23:47:07-05:00
**Tags:** cad-closed-loop-ms0, u-cad-geom-composition, auto-distilled

## Subject
[MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-GEOM-COMPOSITION (slot:india): add the surface-TOPOLOGY training signal -- a quantitative step beyond presence-only toward geometric fidelity.

## Body
```
[MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-GEOM-COMPOSITION (slot:india): add the surface-TOPOLOGY training signal -- a quantitative step beyond presence-only toward geometric fidelity.

CONTEXT: dimensional GT (values+tolerances) genuinely does NOT exist yet -- all 64 GT dims are presence_only and the STEP report carries no radii/lengths (true dimensional GT needs a STEP re-mine, a separate milestone). But the STEP report's per-class surface-primitive composition (total_cylindrical/toroidal/conical/b_spline + simple/medium/complex histogram, mined from 665 JM-Die STEP files) was UNUSED by training.

BUILD: scripts/lib/cad-geometry-composition-to-training.mjs (pure: per_class entry -> per-part averages, e.g. die = ~22.8 cylindrical, ~39.6 B-spline surfaces; 51%/32%/17% simple/medium/complex; R12 skips 0-file classes -- no fabricated composition) + scripts/build-cad-geometry-composition-dataset.mjs (report -> state/shared/lora/cad-geometry-composition-dataset.jsonl). Registered as advisory lora-training-jsonl source.

VALIDATED LIVE (R15): 11 pairs from 11 classes; assembler folds 'cad-geometry-composition: 11 added' -> CAD-gen corpus now 111 pairs across 3 complementary signals (29 corrections + 71 feature-priors + 11 topology) / 11 classes, training_ready true, 34 galaxies. 11 tests.

[MAIN-FORCE]: feeds the fleet training corpus (all 34 galaxies). The 3rd CAD-gen training signal; teaches the generator the surface-primitive MIX per class (steers modelling approach), complementing WHICH features (priors) + corrections.
```

## Files touched (7)
- scripts/build-cad-geometry-composition-dataset.mjs        | 74 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-cad-geometry-composition-dataset.test.mjs   | 32 ++++++++++++++++++++++++++++++++
- scripts/build-fleet-training-corpus-inventory.mjs         | 14 ++++++++++++++
- scripts/lib/cad-geometry-composition-to-training.mjs      | 76 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/cad-geometry-composition-to-training.test.mjs | 66 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/lora/cad-geometry-composition-dataset.jsonl  | 11 +++++++++++
- 6 files changed, 273 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 22be177ec339`
- Milestone envelope: `mcp-server/data/milestones/CAD-CLOSED-LOOP-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._